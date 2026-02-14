import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { nodes, edges, graphs, graphFiles, nodeLayers, layerQaPairs, cards } from "~/server/db/schema";
import type { db } from "~/server/db";
import { deleteDataFile } from "~/server/services/file-storage";

export async function deleteGraphRecursive(database: typeof db, graphId: string) {
  const childNodes = await database.select().from(nodes).where(eq(nodes.graphId, graphId));
  for (const node of childNodes) {
    if (node.subGraphId) await deleteGraphRecursive(database, node.subGraphId);
  }
  const files = await database.select().from(graphFiles).where(eq(graphFiles.graphId, graphId));
  for (const f of files) {
    deleteDataFile(f.filePath);
  }
  await database.delete(graphFiles).where(eq(graphFiles.graphId, graphId));
  await database.delete(edges).where(eq(edges.graphId, graphId));
  await database.delete(nodes).where(eq(nodes.graphId, graphId));
  await database.delete(graphs).where(eq(graphs.id, graphId));
}

export const nodesRouter = createTRPCRouter({
  listByGraph: publicProcedure
    .input(z.object({ graphId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch all nodes
      const dbNodes = await ctx.db
        .select()
        .from(nodes)
        .where(eq(nodes.graphId, input.graphId));

      if (dbNodes.length === 0) return [];

      // Fetch all layers for these nodes
      const nodeIds = dbNodes.map((n) => n.id);
      const allLayers = await ctx.db
        .select()
        .from(nodeLayers)
        .where(or(...nodeIds.map((id) => eq(nodeLayers.nodeId, id))))
        .orderBy(nodeLayers.order);

      // Fetch all QA pairs for these layers
      const layerIds = allLayers.map((l) => l.id);
      const allQaPairs = layerIds.length > 0
        ? await ctx.db
            .select()
            .from(layerQaPairs)
            .where(or(...layerIds.map((id) => eq(layerQaPairs.layerId, id))))
            .orderBy(layerQaPairs.order)
        : [];

      // Fetch all cards for these QA pairs
      const qaPairIds = allQaPairs.map((q) => q.id);
      const allCards = qaPairIds.length > 0
        ? await ctx.db
            .select()
            .from(cards)
            .where(or(...qaPairIds.map((id) => eq(cards.qaPairId, id))))
        : [];

      // Build lookup maps
      const cardsByQaPairId = new Map(allCards.map((c) => [c.qaPairId, c]));
      const qaPairsByLayerId = new Map<string, typeof allQaPairs>();
      for (const qa of allQaPairs) {
        const existing = qaPairsByLayerId.get(qa.layerId) ?? [];
        existing.push(qa);
        qaPairsByLayerId.set(qa.layerId, existing);
      }
      const layersByNodeId = new Map<string, typeof allLayers>();
      for (const layer of allLayers) {
        const existing = layersByNodeId.get(layer.nodeId) ?? [];
        existing.push(layer);
        layersByNodeId.set(layer.nodeId, existing);
      }

      // Assemble nested structure
      return dbNodes.map((node) => ({
        ...node,
        layers: (layersByNodeId.get(node.id) ?? []).map((layer) => ({
          ...layer,
          qaPairs: (qaPairsByLayerId.get(layer.id) ?? []).map((qa) => ({
            ...qa,
            card: cardsByQaPairId.get(qa.id) ?? null,
          })),
        })),
      }));
    }),

  create: publicProcedure
    .input(
      z.object({
        graphId: z.string(),
        label: z.string().min(1),
        type: z.string().default("default"),
        positionX: z.number(),
        positionY: z.number(),
        width: z.number().nullable().optional(),
        height: z.number().nullable().optional(),
        subGraphId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      await ctx.db.insert(nodes).values({
        id,
        graphId: input.graphId,
        label: input.label,
        type: input.type,
        positionX: input.positionX,
        positionY: input.positionY,
        width: input.width ?? null,
        height: input.height ?? null,
        subGraphId: input.subGraphId ?? null,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        label: z.string().min(1).optional(),
        type: z.string().optional(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        width: z.number().nullable().optional(),
        height: z.number().nullable().optional(),
        subGraphId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input;
      await ctx.db
        .update(nodes)
        .set({ ...fields, updatedAt: new Date().toISOString() })
        .where(eq(nodes.id, id));
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [node] = await ctx.db
        .select()
        .from(nodes)
        .where(eq(nodes.id, input.id));
      if (node?.subGraphId) {
        await deleteGraphRecursive(ctx.db, node.subGraphId);
      }
      await ctx.db.delete(edges).where(
        or(eq(edges.sourceNodeId, input.id), eq(edges.targetNodeId, input.id)),
      );
      await ctx.db.delete(nodes).where(eq(nodes.id, input.id));
    }),
});
