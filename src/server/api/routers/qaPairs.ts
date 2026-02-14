import { z } from "zod";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { layerQaPairs, cards } from "~/server/db/schema";

export const qaPairsRouter = createTRPCRouter({
  listByLayer: publicProcedure
    .input(z.object({ layerId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(layerQaPairs)
        .where(eq(layerQaPairs.layerId, input.layerId))
        .orderBy(layerQaPairs.order);
    }),

  create: publicProcedure
    .input(
      z.object({
        layerId: z.string(),
        question: z.string().min(1),
        answer: z.string().min(1),
        order: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const qaPairId = uuidv4();
      const cardId = uuidv4();
      const now = new Date().toISOString();

      // Create QA pair
      await ctx.db.insert(layerQaPairs).values({
        id: qaPairId,
        layerId: input.layerId,
        question: input.question,
        answer: input.answer,
        order: input.order,
        createdAt: now,
        updatedAt: now,
      });

      // Auto-create card in 'new' state
      await ctx.db.insert(cards).values({
        id: cardId,
        qaPairId,
        state: "new",
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        createdAt: now,
        updatedAt: now,
      });

      return { id: qaPairId, cardId };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        question: z.string().min(1).optional(),
        answer: z.string().min(1).optional(),
        order: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await ctx.db
        .update(layerQaPairs)
        .set({ ...fields, updatedAt: new Date().toISOString() })
        .where(eq(layerQaPairs.id, id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(layerQaPairs).where(eq(layerQaPairs.id, input.id));
    }),

  reorder: publicProcedure
    .input(
      z.object({
        layerId: z.string(),
        pairIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      for (let i = 0; i < input.pairIds.length; i++) {
        await ctx.db
          .update(layerQaPairs)
          .set({ order: i, updatedAt: now })
          .where(eq(layerQaPairs.id, input.pairIds[i]!));
      }
    }),
});
