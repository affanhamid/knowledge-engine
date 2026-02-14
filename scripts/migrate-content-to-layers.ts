// scripts/migrate-content-to-layers.ts
// Run with: npx tsx scripts/migrate-content-to-layers.ts
//
// This script migrates existing node content into the new layer/QA pair structure.
// Run BEFORE drizzle-kit push if you have existing data.
// Can also be run AFTER push if the new tables are empty.

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const client = createClient({ url: process.env.DATABASE_URL! });
const db = drizzle(client);

async function migrate() {
  // Check if content column still exists (pre-push) or if we need to use backed-up data
  let oldNodes: { id: string; label: string; content: string | null }[];
  try {
    oldNodes = await db.all<{ id: string; label: string; content: string | null }>(
      sql`SELECT id, label, content FROM knowledge_engine_node WHERE content IS NOT NULL AND content != ''`
    );
  } catch {
    console.log("Content column no longer exists. Cannot migrate.");
    return;
  }

  console.log(`Found ${oldNodes.length} nodes with content to migrate`);

  for (const node of oldNodes) {
    const layerId = uuidv4();
    const qaPairId = uuidv4();
    const cardId = uuidv4();
    const now = new Date().toISOString();

    // Create fact layer (using Drizzle camelCase column names)
    await db.run(sql`
      INSERT INTO knowledge_engine_node_layer (id, nodeId, type, title, "order", createdAt, updatedAt)
      VALUES (${layerId}, ${node.id}, 'fact', NULL, 0, ${now}, ${now})
    `);

    // Create QA pair with label as question, content as answer
    await db.run(sql`
      INSERT INTO knowledge_engine_layer_qa_pair (id, layerId, question, answer, "order", createdAt, updatedAt)
      VALUES (${qaPairId}, ${layerId}, ${node.label}, ${node.content}, 0, ${now}, ${now})
    `);

    // Create card in 'new' state
    await db.run(sql`
      INSERT INTO knowledge_engine_card (id, qaPairId, state, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, createdAt, updatedAt)
      VALUES (${cardId}, ${qaPairId}, 'new', 0, 0, 0, 0, 0, 0, ${now}, ${now})
    `);

    console.log(`Migrated node ${node.id}: "${node.label}"`);
  }

  console.log("Migration complete");
}

migrate().catch(console.error);
