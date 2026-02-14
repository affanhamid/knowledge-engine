import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { reviewLogs } from "~/server/db/schema";

export const reviewLogsRouter = createTRPCRouter({
  listByCard: publicProcedure
    .input(z.object({ cardId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(reviewLogs)
        .where(eq(reviewLogs.cardId, input.cardId))
        .orderBy(desc(reviewLogs.reviewedAt));
    }),
});
