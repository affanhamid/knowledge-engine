import { sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator(
  (name) => `knowledge_engine_${name}`,
);

// --- Folders ---
export const folders = createTable("folder", (d) => ({
  id: d.text().primaryKey(),
  name: d.text().notNull(),
  createdAt: d
    .text()
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: d
    .text()
    .notNull()
    .default(sql`(datetime('now'))`),
}));

// --- Graphs ---
export const graphs = createTable("graph", (d) => ({
  id: d.text().primaryKey(),
  folderId: d
    .text()
    .notNull()
    .references(() => folders.id),
  title: d.text().notNull(),
  createdAt: d
    .text()
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: d
    .text()
    .notNull()
    .default(sql`(datetime('now'))`),
}));

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

// --- Edges ---
export const edges = createTable(
  "edge",
  (d) => ({
    id: d.text().primaryKey(),
    graphId: d
      .text()
      .notNull()
      .references(() => graphs.id),
    sourceNodeId: d
      .text()
      .notNull()
      .references(() => nodes.id),
    targetNodeId: d
      .text()
      .notNull()
      .references(() => nodes.id),
    sourceHandle: d.text(),
    targetHandle: d.text(),
    label: d.text(),
    type: d.text().notNull().default("default"),
    createdAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
  }),
  (t) => [index("edge_graph_idx").on(t.graphId)],
);

// --- Graph Files (data files for code execution) ---
export const graphFiles = createTable(
  "graph_file",
  (d) => ({
    id: d.text().primaryKey(),
    graphId: d
      .text()
      .notNull()
      .references(() => graphs.id),
    fileName: d.text().notNull(),
    filePath: d.text().notNull(),
    fileSizeBytes: d.integer().notNull(),
    mimeType: d.text().notNull(),
    createdAt: d
      .text()
      .notNull()
      .default(sql`(datetime('now'))`),
  }),
  (t) => [index("graph_file_graph_idx").on(t.graphId)],
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
