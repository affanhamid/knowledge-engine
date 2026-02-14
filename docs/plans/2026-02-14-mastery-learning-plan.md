# Mastery Learning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor nodes from single-content blocks to composite nodes with knowledge layers, Q&A pairs, and per-pair spaced repetition tracking (FSRS).

**Architecture:** Node → Layers (fact/intuition/proof) → QA Pairs → Card (1:1 FSRS state). Eager-load all layers with node queries. CompositeNode component with tab-based layer switching and chevron QA navigation. Separate /review page for spaced repetition sessions.

**Tech Stack:** Next.js 15, Drizzle ORM + SQLite, tRPC, React Flow, Tailwind v4

---

### Task 1: Update Schema — New Tables + Modify Nodes

**Files:**
- Modify: `src/server/db/schema.ts`

**Step 1: Add the four new tables and remove columns from nodes**

Replace the entire `nodes` table definition and add new tables after `graphFiles`. The final schema.ts should contain:

```typescript
// --- Nodes --- (MODIFIED: removed content, imageUrl, executionOutput)
export const nodes = createTable(
  "node",
  (d) => ({
    id: d.text().primaryKey(),
    graphId: d
      .text()
      .notNull()
      .references(() => graphs.id),
    label: d.text().notNull(),
    type: d.text().notNull().default("default"),
    positionX: d.real().notNull(),
    positionY: d.real().notNull(),
    width: d.real(),
    height: d.real(),
    subGraphId: d.text().references(() => graphs.id),
    createdAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
  }),
  (t) => [index("node_graph_idx").on(t.graphId)],
);

// --- Node Layers ---
export const nodeLayers = createTable(
  "node_layer",
  (d) => ({
    id: d.text().primaryKey(),
    nodeId: d
      .text()
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    type: d.text().notNull(), // 'fact' | 'intuition' | 'proof'
    title: d.text(),
    order: d.integer().notNull().default(0),
    createdAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
  }),
  (t) => [index("node_layer_node_idx").on(t.nodeId)],
);

// --- Layer QA Pairs ---
export const layerQaPairs = createTable(
  "layer_qa_pair",
  (d) => ({
    id: d.text().primaryKey(),
    layerId: d
      .text()
      .notNull()
      .references(() => nodeLayers.id, { onDelete: "cascade" }),
    question: d.text().notNull(),
    answer: d.text().notNull(),
    order: d.integer().notNull().default(0),
    createdAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
  }),
  (t) => [index("layer_qa_pair_layer_idx").on(t.layerId)],
);

// --- Cards (FSRS Spaced Repetition State) ---
export const cards = createTable(
  "card",
  (d) => ({
    id: d.text().primaryKey(),
    qaPairId: d
      .text()
      .notNull()
      .unique()
      .references(() => layerQaPairs.id, { onDelete: "cascade" }),
    state: d.text().notNull().default("new"), // new | learning | review | relearning
    stability: d.real().notNull().default(0),
    difficulty: d.real().notNull().default(0),
    elapsedDays: d.real().notNull().default(0),
    scheduledDays: d.real().notNull().default(0),
    reps: d.integer().notNull().default(0),
    lapses: d.integer().notNull().default(0),
    dueDate: d.text(),
    lastReview: d.text(),
    createdAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
  }),
  (t) => [
    index("card_qa_pair_idx").on(t.qaPairId),
    index("card_due_date_idx").on(t.dueDate),
  ],
);

// --- Review Logs ---
export const reviewLogs = createTable(
  "review_log",
  (d) => ({
    id: d.text().primaryKey(),
    cardId: d
      .text()
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    rating: d.integer().notNull(), // 1=Again, 2=Hard, 3=Good, 4=Easy
    state: d.text().notNull(), // card state at review time
    scheduledDays: d.real().notNull(),
    elapsedDays: d.real().notNull(),
    reviewedAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
  }),
  (t) => [index("review_log_card_idx").on(t.cardId)],
);
```

**Step 2: Push schema to database**

Run: `pnpm db:push`

This uses `drizzle-kit push` which will show the SQL diff. Since we're removing columns and adding tables, review the output carefully. SQLite doesn't support `DROP COLUMN` natively — Drizzle will recreate the table. Accept the changes.

Expected: Tables `knowledge_engine_node_layer`, `knowledge_engine_layer_qa_pair`, `knowledge_engine_card`, `knowledge_engine_review_log` created. Nodes table recreated without `content`, `imageUrl`, `executionOutput`.

**Step 3: Commit**

```bash
git add src/server/db/schema.ts
git commit -m "feat: add node_layers, layer_qa_pairs, cards, review_logs tables

Remove content/imageUrl/executionOutput from nodes table.
New hierarchy: Node → Layers → QA Pairs → Card (FSRS)."
```

---

### Task 2: Migration Script — Move Existing Content to Layers

**Files:**
- Create: `scripts/migrate-content-to-layers.ts`

**Step 1: Write the migration script**

This script reads all nodes that had content (now lost after schema push — if the DB had data, we need to run this BEFORE pushing schema).

**IMPORTANT:** If the database has existing data, run this migration BEFORE Task 1 Step 2 (db:push). If starting fresh, skip this task entirely.

```typescript
// scripts/migrate-content-to-layers.ts
// Run with: npx tsx scripts/migrate-content-to-layers.ts
//
// This script migrates existing node content into the new layer/QA pair structure.
// Run BEFORE drizzle-kit push if you have existing data.

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const client = createClient({ url: process.env.DATABASE_URL! });
const db = drizzle(client);

async function migrate() {
  // Read old nodes with content (before schema change removes the column)
  const oldNodes = await db.all<{ id: string; label: string; content: string | null }>(
    sql`SELECT id, label, content FROM knowledge_engine_node WHERE content IS NOT NULL AND content != ''`
  );

  console.log(`Found ${oldNodes.length} nodes with content to migrate`);

  for (const node of oldNodes) {
    const layerId = uuidv4();
    const qaPairId = uuidv4();
    const cardId = uuidv4();
    const now = new Date().toISOString();

    // Create fact layer
    await db.run(sql`
      INSERT INTO knowledge_engine_node_layer (id, node_id, type, title, "order", created_at, updated_at)
      VALUES (${layerId}, ${node.id}, 'fact', NULL, 0, ${now}, ${now})
    `);

    // Create QA pair with label as question, content as answer
    await db.run(sql`
      INSERT INTO knowledge_engine_layer_qa_pair (id, layer_id, question, answer, "order", created_at, updated_at)
      VALUES (${qaPairId}, ${layerId}, ${node.label}, ${node.content}, 0, ${now}, ${now})
    `);

    // Create card in 'new' state
    await db.run(sql`
      INSERT INTO knowledge_engine_card (id, qa_pair_id, state, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, created_at, updated_at)
      VALUES (${cardId}, ${qaPairId}, 'new', 0, 0, 0, 0, 0, 0, ${now}, ${now})
    `);

    console.log(`Migrated node ${node.id}: "${node.label}"`);
  }

  console.log("Migration complete");
}

migrate().catch(console.error);
```

**Step 2: Commit**

```bash
git add scripts/migrate-content-to-layers.ts
git commit -m "feat: add content-to-layers migration script"
```

---

### Task 3: Node Layers tRPC Router

**Files:**
- Create: `src/server/api/routers/nodeLayers.ts`
- Modify: `src/server/api/root.ts`

**Step 1: Create the nodeLayers router**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/server/api/routers/nodeLayers.ts
git commit -m "feat: add nodeLayers tRPC router (CRUD + reorder)"
```

---

### Task 4: QA Pairs tRPC Router

**Files:**
- Create: `src/server/api/routers/qaPairs.ts`

**Step 1: Create the qaPairs router**

This router auto-creates a `cards` row in `state: 'new'` whenever a QA pair is created.

```typescript
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
```

**Step 2: Commit**

```bash
git add src/server/api/routers/qaPairs.ts
git commit -m "feat: add qaPairs tRPC router (CRUD + reorder + auto-create card)"
```

---

### Task 5: Cards tRPC Router (FSRS Review)

**Files:**
- Create: `src/server/api/routers/cards.ts`

**Step 1: Create the cards router**

This router implements FSRS-lite scheduling. The `review` procedure applies the FSRS algorithm and creates a review log entry.

```typescript
import { z } from "zod";
import { eq, and, lte, isNotNull } from "drizzle-orm";
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
```

**Step 2: Commit**

```bash
git add src/server/api/routers/cards.ts
git commit -m "feat: add cards tRPC router with FSRS scheduling algorithm"
```

---

### Task 6: Review Logs Router + Register All New Routers

**Files:**
- Create: `src/server/api/routers/reviewLogs.ts`
- Modify: `src/server/api/root.ts`

**Step 1: Create reviewLogs router**

```typescript
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
```

**Step 2: Register all new routers in root.ts**

Modify `src/server/api/root.ts` to import and register:

```typescript
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
```

**Step 3: Commit**

```bash
git add src/server/api/routers/reviewLogs.ts src/server/api/root.ts
git commit -m "feat: add reviewLogs router, register all new routers"
```

---

### Task 7: Update Nodes Router — Eager Load Layers

**Files:**
- Modify: `src/server/api/routers/nodes.ts`

**Step 1: Update listByGraph to join layers, QA pairs, and cards**

Replace the `listByGraph` query and remove `content`/`imageUrl`/`executionOutput` from `create` and `update` inputs:

```typescript
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
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors related to the nodes router. There WILL be errors in `flow-editor.tsx` and `custom-node.tsx` since they still reference `content` — that's expected and fixed in the next tasks.

**Step 3: Commit**

```bash
git add src/server/api/routers/nodes.ts
git commit -m "feat: update nodes router — eager load layers/QA/cards, remove content fields"
```

---

### Task 8: CompositeNode Component

**Files:**
- Rewrite: `src/app/_components/custom-node.tsx` → becomes the CompositeNode

**Step 1: Replace custom-node.tsx with CompositeNode**

This replaces the existing component entirely. The new component implements:
- Layer type tabs (F/I/P)
- QA pair navigation with chevrons
- SRS status dots per QA pair
- MarkdownRenderer for question/answer content

```typescript
"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeResizer, type NodeProps } from "@xyflow/react";
import { Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { MarkdownRenderer } from "@affanhamid/markdown-renderer";

type CardData = {
  id: string;
  state: string;
  dueDate: string | null;
  stability: number;
};

type QaPairData = {
  id: string;
  question: string;
  answer: string;
  order: number;
  card: CardData | null;
};

type LayerData = {
  id: string;
  type: "fact" | "intuition" | "proof";
  title: string | null;
  order: number;
  qaPairs: QaPairData[];
};

export type CompositeNodeData = {
  label: string;
  subGraphId?: string | null;
  layers: LayerData[];
  onResizeEnd?: (width: number, height: number) => void;
};

const LAYER_LABELS: Record<string, string> = {
  fact: "F",
  intuition: "I",
  proof: "P",
};

const LAYER_COLORS: Record<string, { active: string; inactive: string }> = {
  fact: { active: "bg-blue-500 text-white", inactive: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  intuition: { active: "bg-amber-500 text-white", inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  proof: { active: "bg-emerald-500 text-white", inactive: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
};

function getSrsColor(card: CardData | null): string {
  if (!card) return "bg-gray-300"; // no card
  if (card.state === "new") return "bg-gray-400";
  if (!card.dueDate) return "bg-gray-400";

  const now = Date.now();
  const due = new Date(card.dueDate).getTime();
  const hoursUntilDue = (due - now) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return "bg-red-500"; // overdue
  if (hoursUntilDue < 24) return "bg-yellow-500"; // due soon
  return "bg-green-500"; // not due
}

function CompositeNodeComponent({ id, data, selected }: NodeProps & { data: CompositeNodeData }) {
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [activeQaIndex, setActiveQaIndex] = useState(0);

  const sortedLayers = [...data.layers].sort((a, b) => a.order - b.order);
  const activeLayer = sortedLayers[activeLayerIndex];
  const qaPairs = activeLayer?.qaPairs.sort((a, b) => a.order - b.order) ?? [];
  const activeQa = qaPairs[activeQaIndex];

  // Reset QA index when switching layers
  const handleLayerSwitch = (index: number) => {
    setActiveLayerIndex(index);
    setActiveQaIndex(0);
  };

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-lg border bg-white shadow-sm transition-shadow ${
        selected ? "border-blue-500 shadow-md" : "border-gray-200"
      }`}
      style={{ minWidth: 200, minHeight: 100 }}
    >
      <NodeResizer
        color="#3b82f6"
        isVisible={selected}
        minWidth={200}
        minHeight={100}
        handleStyle={{ width: 12, height: 12 }}
        lineStyle={{ borderWidth: 4 }}
        onResizeEnd={(_event, params) => {
          data.onResizeEnd?.(params.width, params.height);
        }}
      />

      {/* Handles */}
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-gray-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!bg-gray-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!bg-gray-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!bg-gray-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-gray-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-gray-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!bg-gray-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!bg-gray-400" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="text-sm font-medium text-gray-900 truncate">
          <MarkdownRenderer markdown={data.label} />
        </div>
        {data.subGraphId && (
          <Layers className="ml-2 h-3.5 w-3.5 shrink-0 text-blue-500" />
        )}
      </div>

      {/* Layer tabs */}
      {sortedLayers.length > 0 && (
        <div className="flex gap-1 border-b border-gray-100 px-3 py-1.5">
          {sortedLayers.map((layer, i) => {
            const colors = LAYER_COLORS[layer.type] ?? LAYER_COLORS.fact!;
            return (
              <button
                key={layer.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLayerSwitch(i);
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  i === activeLayerIndex ? colors.active : colors.inactive
                }`}
                title={layer.title ?? layer.type}
              >
                {LAYER_LABELS[layer.type] ?? layer.type[0]?.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      {/* QA Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeQa ? (
          <div className="space-y-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Q</span>
              <div className="text-xs text-gray-800">
                <MarkdownRenderer markdown={activeQa.question} />
              </div>
            </div>
            <div className="border-t border-gray-100 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">A</span>
              <div className="text-xs text-gray-800">
                <MarkdownRenderer markdown={activeQa.answer} />
              </div>
            </div>
          </div>
        ) : sortedLayers.length === 0 ? (
          <p className="text-xs italic text-gray-400">No layers yet</p>
        ) : (
          <p className="text-xs italic text-gray-400">No Q&amp;A pairs in this layer</p>
        )}
      </div>

      {/* Footer: QA navigation + SRS dots */}
      {qaPairs.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveQaIndex((prev) => (prev > 0 ? prev - 1 : qaPairs.length - 1));
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-[10px] tabular-nums text-gray-500">
              {activeQaIndex + 1}/{qaPairs.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveQaIndex((prev) => (prev < qaPairs.length - 1 ? prev + 1 : 0));
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex gap-1">
            {qaPairs.map((qa, i) => (
              <button
                key={qa.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveQaIndex(i);
                }}
                className={`h-2 w-2 rounded-full transition-transform ${getSrsColor(qa.card)} ${
                  i === activeQaIndex ? "scale-125 ring-1 ring-gray-300" : ""
                }`}
                title={qa.card?.state ?? "no card"}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const CustomNode = memo(CompositeNodeComponent);
```

**Note:** We keep the export name `CustomNode` so `flow-editor.tsx`'s `nodeTypes` map doesn't need to change.

**Step 2: Commit**

```bash
git add src/app/_components/custom-node.tsx
git commit -m "feat: replace CustomNode with CompositeNode (layer tabs, QA nav, SRS dots)"
```

---

### Task 9: Update FlowEditor — Types, Transforms, and Edit Panel

**Files:**
- Modify: `src/app/_components/flow-editor.tsx`

This is the largest change. Key modifications:

1. Update `DbNode` type to include nested `layers[]`
2. Update `dbNodesToFlow()` to pass layers as node data
3. Remove `editContent` state, add layer/QA editing state
4. Replace the single-content edit panel with a layer/QA management panel
5. Remove `makeRunCodeHandler` and clipboard paste handler (content is now in QA pairs, not directly on nodes)
6. Add mutations for `nodeLayers` and `qaPairs`

**Step 1: Update the imports, types, and transforms**

The `DbNode` type changes to match what `nodes.listByGraph` now returns (node + nested layers). The `dbNodesToFlow` function maps layers into `CompositeNodeData`.

Key changes at top of file:
- Import `CompositeNodeData` type from custom-node
- Remove `editContent` state
- Add `api.nodeLayers.*` and `api.qaPairs.*` mutations
- Update `dbNodesToFlow` to map nested layers
- Remove `makeRunCodeHandler` callback
- Remove clipboard paste handler for images
- Remove `executionOutput` from update calls

**Step 2: Replace the edit panel**

The right-side panel when a node is selected should now show:
- Node label editor (same as before)
- "Layers" section with add/delete layer buttons
- For the selected layer: list of QA pairs with inline question/answer editors
- Add QA pair button

**Step 3: Update node creation**

When creating a new node, don't pass `content`. The node starts with zero layers — user adds them via the edit panel.

Update `addNewNode`, `onConnectEnd`, and `handlePdfUpload` callbacks to remove `content: null` from the data object passed to React Flow nodes.

**Step 4: Invalidate queries on layer/QA mutations**

After any `nodeLayers.create/update/delete` or `qaPairs.create/update/delete`, call `utils.nodes.listByGraph.invalidate({ graphId })` to refetch the full node tree and update React Flow state.

**Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — all type errors resolved.

**Step 6: Run dev server and verify**

Run: `pnpm dev`
Expected: Graph page loads. Nodes render with the new CompositeNode layout. Empty nodes show "No layers yet". Edit panel shows layer management UI.

**Step 7: Commit**

```bash
git add src/app/_components/flow-editor.tsx
git commit -m "feat: update FlowEditor for composite nodes — layer/QA editing panel"
```

---

### Task 10: Review Page

**Files:**
- Create: `src/app/review/page.tsx`

**Step 1: Create the review page**

A simple flashcard-style review interface:
- Fetches due cards via `api.cards.listDue`
- Shows question (markdown rendered)
- "Show Answer" button reveals the answer
- 4 rating buttons: Again (1), Hard (2), Good (3), Easy (4)
- Calls `api.cards.review` with the rating
- Progresses to next card
- Shows "All caught up!" when queue is empty

```typescript
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { MarkdownRenderer } from "@affanhamid/markdown-renderer";

export default function ReviewPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const { data: dueCards, refetch } = api.cards.listDue.useQuery({ limit: 50 });
  const reviewMutation = api.cards.review.useMutation();

  const currentCard = dueCards?.[currentIndex];

  const handleRate = async (rating: number) => {
    if (!currentCard) return;
    await reviewMutation.mutateAsync({ cardId: currentCard.card.id, rating });
    setShowAnswer(false);

    if (currentIndex + 1 < (dueCards?.length ?? 0)) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Refetch to check for more due cards
      await refetch();
      setCurrentIndex(0);
    }
  };

  if (!dueCards) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (dueCards.length === 0 || currentIndex >= dueCards.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">All caught up!</h1>
        <p className="text-gray-500">No cards due for review.</p>
        <a href="/" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800">
          Back to Home
        </a>
      </div>
    );
  }

  const { qaPair, layer, node } = currentCard;

  return (
    <div className="flex h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
          <span>{node.label}</span>
          <span>/</span>
          <span className="capitalize">{layer.type}</span>
          <span className="ml-auto">
            {currentIndex + 1} / {dueCards.length}
          </span>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Question */}
          <div className="mb-6">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Question
            </span>
            <div className="text-lg text-gray-900">
              <MarkdownRenderer markdown={qaPair.question} />
            </div>
          </div>

          {/* Answer */}
          {showAnswer ? (
            <div className="border-t border-gray-100 pt-6">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                Answer
              </span>
              <div className="text-base text-gray-800">
                <MarkdownRenderer markdown={qaPair.answer} />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Show Answer
            </button>
          )}
        </div>

        {/* Rating buttons */}
        {showAnswer && (
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => handleRate(1)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-red-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Again
            </button>
            <button
              onClick={() => handleRate(2)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              Hard
            </button>
            <button
              onClick={() => handleRate(3)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Good
            </button>
            <button
              onClick={() => handleRate(4)}
              disabled={reviewMutation.isPending}
              className="rounded-lg bg-green-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
            >
              Easy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/review/page.tsx
git commit -m "feat: add /review page with FSRS flashcard review UI"
```

---

### Task 11: Verify End-to-End

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — no type errors.

**Step 2: Push schema**

Run: `pnpm db:push`
Expected: All tables created/updated successfully.

**Step 3: Start dev server and test**

Run: `pnpm dev`

Test manually:
1. Open a graph page — nodes render with CompositeNode layout
2. Click a node — edit panel shows layer management
3. Add a "fact" layer → add a QA pair with question + answer
4. Layer tab appears on node, QA content renders
5. Add more QA pairs — chevron navigation works
6. Navigate to `/review` — due cards appear (new cards should show)
7. Rate a card — FSRS updates the card, moves to next

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: mastery learning architecture complete — composite nodes with FSRS review"
```
