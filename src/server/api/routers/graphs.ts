import { z } from "zod";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { graphs, nodes, edges } from "~/server/db/schema";
import { deleteGraphRecursive } from "./nodes";
import { generateGraphFromFile } from "~/server/services/gemini";
import { getAbsolutePath } from "~/server/services/file-storage";
import { computeLayeredPositions } from "~/server/services/graph-layout";

export const graphsRouter = createTRPCRouter({
  listByFolder: publicProcedure
    .input(z.object({ folderId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(graphs)
        .where(eq(graphs.folderId, input.folderId))
        .orderBy(graphs.createdAt);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [graph] = await ctx.db
        .select()
        .from(graphs)
        .where(eq(graphs.id, input.id));
      return graph ?? null;
    }),

  getBreadcrumbs: publicProcedure
    .input(z.object({ graphId: z.string() }))
    .query(async ({ ctx, input }) => {
      const crumbs: { graphId: string; graphTitle: string }[] = [];
      let currentGraphId = input.graphId;

      for (let i = 0; i < 20; i++) {
        const [graph] = await ctx.db
          .select()
          .from(graphs)
          .where(eq(graphs.id, currentGraphId));
        if (!graph) break;

        crumbs.unshift({ graphId: graph.id, graphTitle: graph.title });

        // Find the parent node that has this graph as its subGraphId
        const [parentNode] = await ctx.db
          .select()
          .from(nodes)
          .where(eq(nodes.subGraphId, currentGraphId));
        if (!parentNode) break;

        currentGraphId = parentNode.graphId;
      }

      return crumbs;
    }),

  create: publicProcedure
    .input(z.object({ folderId: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      await ctx.db.insert(graphs).values({
        id,
        folderId: input.folderId,
        title: input.title,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: publicProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(graphs)
        .set({ title: input.title, updatedAt: new Date().toISOString() })
        .where(eq(graphs.id, input.id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteGraphRecursive(ctx.db, input.id);
    }),

  generateFromPdf: publicProcedure
    .input(
      z.object({
        graphId: z.string(),
        filePath: z.string(),
        mimeType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const absolutePath = getAbsolutePath(input.filePath);

      let generated;
      try {
        generated = await generateGraphFromFile(absolutePath, input.mimeType);
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "Failed to generate graph",
        });
      }

      const positions = computeLayeredPositions(generated);

      // Insert nodes, building tempId → realId map
      const tempToReal = new Map<string, string>();
      const now = new Date().toISOString();
      const createdNodes: {
        id: string;
        label: string;
        positionX: number;
        positionY: number;
      }[] = [];

      for (const gNode of generated.nodes) {
        const realId = uuidv4();
        tempToReal.set(gNode.id, realId);
        const pos = positions.get(gNode.id) ?? { x: 0, y: 0 };

        await ctx.db.insert(nodes).values({
          id: realId,
          graphId: input.graphId,
          label: gNode.label,
          type: "default",
          positionX: pos.x,
          positionY: pos.y,
          createdAt: now,
          updatedAt: now,
        });

        createdNodes.push({
          id: realId,
          label: gNode.label,
          positionX: pos.x,
          positionY: pos.y,
        });
      }

      // Insert edges, remapping temp IDs to real UUIDs
      const createdEdges: {
        id: string;
        sourceNodeId: string;
        targetNodeId: string;
        label: string | null;
      }[] = [];

      for (const gEdge of generated.edges) {
        const sourceId = tempToReal.get(gEdge.source);
        const targetId = tempToReal.get(gEdge.target);
        if (!sourceId || !targetId) continue; // skip invalid refs

        const edgeId = uuidv4();
        await ctx.db.insert(edges).values({
          id: edgeId,
          graphId: input.graphId,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          label: gEdge.label,
          type: "default",
          createdAt: now,
        });

        createdEdges.push({
          id: edgeId,
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          label: gEdge.label,
        });
      }

      return {
        nodesCreated: createdNodes.length,
        edgesCreated: createdEdges.length,
        nodes: createdNodes,
        edges: createdEdges,
      };
    }),
});
