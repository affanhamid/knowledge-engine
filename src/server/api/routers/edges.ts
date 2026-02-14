import { z } from "zod";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { edges } from "~/server/db/schema";

export const edgesRouter = createTRPCRouter({
  listByGraph: publicProcedure
    .input(z.object({ graphId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(edges)
        .where(eq(edges.graphId, input.graphId));
    }),

  create: publicProcedure
    .input(
      z.object({
        graphId: z.string(),
        sourceNodeId: z.string(),
        targetNodeId: z.string(),
        sourceHandle: z.string().nullable().default(null),
        targetHandle: z.string().nullable().default(null),
        label: z.string().nullable().default(null),
        type: z.string().default("default"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = uuidv4();
      await ctx.db.insert(edges).values({
        id,
        graphId: input.graphId,
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        sourceHandle: input.sourceHandle,
        targetHandle: input.targetHandle,
        label: input.label,
        type: input.type,
        createdAt: new Date().toISOString(),
      });
      return { id };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        sourceNodeId: z.string().optional(),
        targetNodeId: z.string().optional(),
        sourceHandle: z.string().nullable().optional(),
        targetHandle: z.string().nullable().optional(),
        label: z.string().nullable().optional(),
        type: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await ctx.db.update(edges).set(fields).where(eq(edges.id, id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(edges).where(eq(edges.id, input.id));
    }),
});
