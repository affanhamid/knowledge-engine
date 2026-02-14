import { createClient } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";

// --- Types ---
interface NodeData {
  id: string;
  data: {
    label: string;
    content: string | null;
    subGraphId?: string | null;
  };
  [key: string]: unknown;
}

// --- HTML entity decoding ---
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function main() {
  // 1. Read content.md
  const contentPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "content.md");
  const raw = fs.readFileSync(contentPath, "utf-8");

  // 2. Extract the first JSON array (nodes) from between [ and ]
  const firstBracket = raw.indexOf("[");
  if (firstBracket === -1) {
    throw new Error("Could not find opening '[' in content.md");
  }

  // Find the matching closing bracket
  let depth = 0;
  let endBracket = -1;
  for (let i = firstBracket; i < raw.length; i++) {
    if (raw[i] === "[") depth++;
    if (raw[i] === "]") depth--;
    if (depth === 0) {
      endBracket = i;
      break;
    }
  }

  if (endBracket === -1) {
    throw new Error("Could not find matching closing ']' in content.md");
  }

  const jsonStr = raw.substring(firstBracket, endBracket + 1);
  const nodes: NodeData[] = JSON.parse(jsonStr);

  console.log(`Parsed ${nodes.length} total nodes`);

  // 3. Filter nodes where content is not null
  const nodesWithContent = nodes.filter((n) => n.data.content !== null);
  console.log(`Found ${nodesWithContent.length} nodes with content`);

  // 4. Connect to database
  const databaseUrl = process.env.DATABASE_URL ?? "file:./db.sqlite";
  const client = createClient({ url: databaseUrl });

  const now = new Date().toISOString().replace("T", " ").substring(0, 19);

  let inserted = 0;
  let skipped = 0;

  for (const node of nodesWithContent) {
    const nodeId = node.id;
    const label = decodeHtmlEntities(node.data.label);
    const content = decodeHtmlEntities(node.data.content!);

    // Check that the node exists in the database
    const existing = await client.execute({
      sql: "SELECT id FROM knowledge_engine_node WHERE id = ?",
      args: [nodeId],
    });

    if (existing.rows.length === 0) {
      console.log(`  SKIP: node "${label}" (${nodeId}) not found in DB`);
      skipped++;
      continue;
    }

    // Check if this node already has a layer (avoid duplicates)
    const existingLayer = await client.execute({
      sql: "SELECT id FROM knowledge_engine_node_layer WHERE nodeId = ?",
      args: [nodeId],
    });

    if (existingLayer.rows.length > 0) {
      console.log(`  SKIP: node "${label}" already has a layer`);
      skipped++;
      continue;
    }

    // Generate UUIDs
    const layerId = uuidv4();
    const qaPairId = uuidv4();
    const cardId = uuidv4();

    // Insert node_layer
    await client.execute({
      sql: `INSERT INTO knowledge_engine_node_layer (id, nodeId, type, title, "order", createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [layerId, nodeId, "fact", null, 0, now, now],
    });

    // Insert layer_qa_pair
    await client.execute({
      sql: `INSERT INTO knowledge_engine_layer_qa_pair (id, layerId, question, answer, "order", createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [qaPairId, layerId, label, content, 0, now, now],
    });

    // Insert card
    await client.execute({
      sql: `INSERT INTO knowledge_engine_card (id, qaPairId, state, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [cardId, qaPairId, "new", 0, 0, 0, 0, 0, 0, now, now],
    });

    console.log(`  OK: "${label}" -> layer=${layerId}`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  client.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
