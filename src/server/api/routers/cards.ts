import { z } from "zod";
import { eq, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { cards, reviewLogs, layerQaPairs, nodeLayers, nodes } from "~/server/db/schema";

// FSRS-lite constants
const W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61];
const DECAY = -0.5;
const FACTOR = 19 / 81;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fsrsSchedule(card: {
  state: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  reps: number;
  lapses: number;
}, rating: number): {
  stability: number;
  difficulty: number;
  scheduledDays: number;
  state: string;
  lapses: number;
  reps: number;
} {
  const r = rating; // 1=Again, 2=Hard, 3=Good, 4=Easy
  let s = card.stability;
  let d = card.difficulty;
  let lapses = card.lapses;
  let reps = card.reps;

  if (card.state === "new") {
    // Initial stability
    s = W[r - 1]!;
    // Initial difficulty
    d = clamp(W[4]! - Math.exp(W[5]! * (r - 1)) + 1, 1, 10);
    reps = 1;

    if (r === 1) {
      return { stability: s, difficulty: d, scheduledDays: 0, state: "learning", lapses: lapses + 1, reps };
    }
    const interval = Math.max(1, Math.round(s));
    return { stability: s, difficulty: d, scheduledDays: interval, state: "review", lapses, reps };
  }

  // Retrievability
  const elapsedDays = Math.max(card.elapsedDays, 0.01);
  const retrievability = Math.pow(1 + FACTOR * elapsedDays / Math.max(s, 0.01), DECAY);

  // Update difficulty
  const newD = clamp(
    W[7]! * (W[4]! - d) + d + W[6]! * (r - 3),
    1,
    10,
  );

  reps += 1;

  if (r === 1) {
    // Lapse
    lapses += 1;
    const newS = clamp(
      W[11]! * Math.pow(d, -W[12]!) * (Math.pow(s + 1, W[13]!) - 1) * Math.exp(W[14]! * (1 - retrievability)),
      0.01,
      s,
    );
    return { stability: newS, difficulty: newD, scheduledDays: 0, state: "relearning", lapses, reps };
  }

  // Success — recall
  const hardPenalty = r === 2 ? W[15]! : 1;
  const easyBonus = r === 4 ? W[16]! : 1;
  const newS = s * (1 + Math.exp(W[8]!) * (11 - d) * Math.pow(s, -W[9]!) * (Math.exp(W[10]! * (1 - retrievability)) - 1) * hardPenalty * easyBonus);

  const interval = Math.max(1, Math.round(newS));
  return { stability: newS, difficulty: newD, scheduledDays: interval, state: "review", lapses, reps };
}

export const cardsRouter = createTRPCRouter({
  listDue: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      // Cards that are due (dueDate <= now) or new (dueDate is null)
      const dueCards = await ctx.db
        .select({
          card: cards,
          qaPair: layerQaPairs,
          layer: nodeLayers,
          node: nodes,
        })
        .from(cards)
        .innerJoin(layerQaPairs, eq(cards.qaPairId, layerQaPairs.id))
        .innerJoin(nodeLayers, eq(layerQaPairs.layerId, nodeLayers.id))
        .innerJoin(nodes, eq(nodeLayers.nodeId, nodes.id))
        .where(
          lte(cards.dueDate, now),
        )
        .limit(input.limit);

      // Also get new cards (no dueDate set)
      const newCards = await ctx.db
        .select({
          card: cards,
          qaPair: layerQaPairs,
          layer: nodeLayers,
          node: nodes,
        })
        .from(cards)
        .innerJoin(layerQaPairs, eq(cards.qaPairId, layerQaPairs.id))
        .innerJoin(nodeLayers, eq(layerQaPairs.layerId, nodeLayers.id))
        .innerJoin(nodes, eq(nodeLayers.nodeId, nodes.id))
        .where(eq(cards.state, "new"))
        .limit(input.limit);

      // Combine and deduplicate
      const seen = new Set<string>();
      const combined = [];
      for (const row of [...dueCards, ...newCards]) {
        if (!seen.has(row.card.id)) {
          seen.add(row.card.id);
          combined.push(row);
        }
      }
      return combined.slice(0, input.limit);
    }),

  review: publicProcedure
    .input(
      z.object({
        cardId: z.string(),
        rating: z.number().int().min(1).max(4),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [card] = await ctx.db
        .select()
        .from(cards)
        .where(eq(cards.id, input.cardId));

      if (!card) throw new Error("Card not found");

      const now = new Date().toISOString();
      const elapsedDays = card.lastReview
        ? (Date.now() - new Date(card.lastReview).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      const result = fsrsSchedule(
        { ...card, elapsedDays },
        input.rating,
      );

      const dueDate = result.scheduledDays > 0
        ? new Date(Date.now() + result.scheduledDays * 24 * 60 * 60 * 1000).toISOString()
        : now; // Due immediately for learning/relearning

      // Update card
      await ctx.db
        .update(cards)
        .set({
          state: result.state,
          stability: result.stability,
          difficulty: result.difficulty,
          elapsedDays,
          scheduledDays: result.scheduledDays,
          reps: result.reps,
          lapses: result.lapses,
          dueDate,
          lastReview: now,
          updatedAt: now,
        })
        .where(eq(cards.id, input.cardId));

      // Create review log
      await ctx.db.insert(reviewLogs).values({
        id: uuidv4(),
        cardId: input.cardId,
        rating: input.rating,
        state: card.state,
        scheduledDays: result.scheduledDays,
        elapsedDays,
        reviewedAt: now,
      });

      return { dueDate, state: result.state, stability: result.stability };
    }),
});
