import { z } from "zod";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { folders, graphs, nodes, edges } from "~/server/db/schema";

export const foldersRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(folders).orderBy(folders.createdAt);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [folder] = await ctx.db
        .select()
        .from(folders)
        .where(eq(folders.id, input.id));
      return folder ?? null;
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      await ctx.db
        .insert(folders)
        .values({ id, name: input.name, createdAt: now, updatedAt: now });
      return { id };
    }),

  rename: publicProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(folders)
        .set({ name: input.name, updatedAt: new Date().toISOString() })
        .where(eq(folders.id, input.id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get all graphs in this folder
      const folderGraphs = await ctx.db
        .select({ id: graphs.id })
        .from(graphs)
        .where(eq(graphs.folderId, input.id));

      for (const g of folderGraphs) {
        await ctx.db.delete(edges).where(eq(edges.graphId, g.id));
        await ctx.db.delete(nodes).where(eq(nodes.graphId, g.id));
      }
      await ctx.db.delete(graphs).where(eq(graphs.folderId, input.id));
      await ctx.db.delete(folders).where(eq(folders.id, input.id));
    }),
});
