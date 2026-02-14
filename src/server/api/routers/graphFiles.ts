import { z } from "zod";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphFiles } from "~/server/db/schema";
import { deleteDataFile } from "~/server/services/file-storage";

export const graphFilesRouter = createTRPCRouter({
  listByGraph: publicProcedure
    .input(z.object({ graphId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(graphFiles)
        .where(eq(graphFiles.graphId, input.graphId));
    }),

  add: publicProcedure
    .input(
      z.object({
        graphId: z.string(),
        fileName: z.string(),
        filePath: z.string(),
        fileSizeBytes: z.number(),
        mimeType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = uuidv4();
      await ctx.db.insert(graphFiles).values({
        id,
        graphId: input.graphId,
        fileName: input.fileName,
        filePath: input.filePath,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        createdAt: new Date().toISOString(),
      });
      return { id };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [file] = await ctx.db
        .select()
        .from(graphFiles)
        .where(eq(graphFiles.id, input.id));
      if (file) {
        deleteDataFile(file.filePath);
      }
      await ctx.db.delete(graphFiles).where(eq(graphFiles.id, input.id));
    }),
});
