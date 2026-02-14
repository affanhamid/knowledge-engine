import { z } from "zod";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { nodeLayers } from "~/server/db/schema";

const LAYER_TYPES = ["fact", "intuition", "proof"] as const;

export const nodeLayersRouter = createTRPCRouter({
  listByNode: publicProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(nodeLayers)
        .where(eq(nodeLayers.nodeId, input.nodeId))
        .orderBy(nodeLayers.order);
    }),

  create: publicProcedure
    .input(
      z.object({
        nodeId: z.string(),
        type: z.enum(LAYER_TYPES),
        title: z.string().nullable().default(null),
        order: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      await ctx.db.insert(nodeLayers).values({
        id,
        nodeId: input.nodeId,
        type: input.type,
        title: input.title,
        order: input.order,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(LAYER_TYPES).optional(),
        title: z.string().nullable().optional(),
        order: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await ctx.db
        .update(nodeLayers)
        .set({ ...fields, updatedAt: new Date().toISOString() })
        .where(eq(nodeLayers.id, id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(nodeLayers).where(eq(nodeLayers.id, input.id));
    }),

  reorder: publicProcedure
    .input(
      z.object({
        nodeId: z.string(),
        layerIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date().toISOString();
      for (let i = 0; i < input.layerIds.length; i++) {
        await ctx.db
          .update(nodeLayers)
          .set({ order: i, updatedAt: now })
          .where(eq(nodeLayers.id, input.layerIds[i]!));
      }
    }),
});
