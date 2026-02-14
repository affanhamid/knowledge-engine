import { foldersRouter } from "~/server/api/routers/folders";
import { graphsRouter } from "~/server/api/routers/graphs";
import { nodesRouter } from "~/server/api/routers/nodes";
import { edgesRouter } from "~/server/api/routers/edges";
import { graphFilesRouter } from "~/server/api/routers/graphFiles";
import { nodeLayersRouter } from "~/server/api/routers/nodeLayers";
import { qaPairsRouter } from "~/server/api/routers/qaPairs";
import { cardsRouter } from "~/server/api/routers/cards";
import { reviewLogsRouter } from "~/server/api/routers/reviewLogs";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  folders: foldersRouter,
  graphs: graphsRouter,
  nodes: nodesRouter,
  edges: edgesRouter,
  graphFiles: graphFilesRouter,
  nodeLayers: nodeLayersRouter,
  qaPairs: qaPairsRouter,
  cards: cardsRouter,
  reviewLogs: reviewLogsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
