# Mastery Learning Architecture Design

## Overview

Refactor the PKM application from "one node = one block of text" to a Composite Node architecture where each node contains multiple knowledge layers, each with reviewable Q&A pairs tracked by spaced repetition (FSRS).

## Decisions

- **Migration**: Existing node `content` becomes a `fact` layer with one QA pair. Clean cutover, no backward compat mode.
- **Layer types**: Fixed enum (`fact`, `intuition`, `proof`). Extend by updating the enum later.
- **Data loading**: Eager load all layers + QA pairs + SRS card state with the node query. Instant layer switching, no loading spinners.
- **SRS granularity**: One card per QA pair (not per layer). Each question/answer is independently reviewed.
- **Review UI**: Separate `/review` page. Not inline in the graph editor.

## Database Schema

### Modified `nodes` table

Remove columns: `content`, `imageUrl`, `executionOutput`.
Keep: `id`, `graphId`, `label`, `type`, `positionX`, `positionY`, `width`, `height`, `subGraphId`, `createdAt`, `updatedAt`.

### New `node_layers` table

| Column    | Type    | Notes                                   |
|-----------|---------|-----------------------------------------|
| id        | text PK | UUID                                    |
| nodeId    | text FK | → nodes.id, cascade delete              |
| type      | text    | CHECK('fact','intuition','proof')        |
| title     | text    | nullable, defaults to type name in UI   |
| order     | integer | NOT NULL DEFAULT 0                      |
| createdAt | text    | ISO string                              |
| updatedAt | text    | ISO string                              |

Index on `nodeId`.

### New `layer_qa_pairs` table

| Column    | Type    | Notes                              |
|-----------|---------|------------------------------------|
| id        | text PK | UUID                               |
| layerId   | text FK | → node_layers.id, cascade delete   |
| question  | text    | NOT NULL, markdown                 |
| answer    | text    | NOT NULL, markdown                 |
| order     | integer | NOT NULL DEFAULT 0                 |
| createdAt | text    | ISO string                         |
| updatedAt | text    | ISO string                         |

Index on `layerId`.

### New `cards` table (FSRS state)

| Column        | Type    | Notes                                         |
|---------------|---------|-----------------------------------------------|
| id            | text PK | UUID                                          |
| qaPairId      | text FK | → layer_qa_pairs.id, UNIQUE (1:1), cascade    |
| state         | text    | DEFAULT 'new', CHECK(new/learning/review/relearning) |
| stability     | real    | DEFAULT 0                                     |
| difficulty    | real    | DEFAULT 0                                     |
| elapsedDays   | real    | DEFAULT 0                                     |
| scheduledDays | real    | DEFAULT 0                                     |
| reps          | integer | DEFAULT 0                                     |
| lapses        | integer | DEFAULT 0                                     |
| dueDate       | text    | ISO string, nullable                          |
| lastReview    | text    | ISO string, nullable                          |
| createdAt     | text    | ISO string                                    |
| updatedAt     | text    | ISO string                                    |

Index on `qaPairId`. Index on `dueDate` (for review page queries).

### New `review_logs` table

| Column        | Type    | Notes                           |
|---------------|---------|---------------------------------|
| id            | text PK | UUID                            |
| cardId        | text FK | → cards.id, cascade delete      |
| rating        | integer | NOT NULL (1=Again, 2=Hard, 3=Good, 4=Easy) |
| state         | text    | card state at review time       |
| scheduledDays | real    |                                 |
| elapsedDays   | real    |                                 |
| reviewedAt    | text    | ISO string                      |

Index on `cardId`.

### Entity hierarchy

```
Node → Layers → QA Pairs → Card (1:1)
                              └→ Review Logs
```

### Migration

For each node with non-null `content`:
1. Create a `node_layers` row: `type='fact'`, `order=0`
2. Create a `layer_qa_pairs` row: `question=node.label`, `answer=node.content`, `order=0`
3. Create a `cards` row: `state='new'`, linked to the QA pair
4. Drop `content`, `imageUrl`, `executionOutput` columns from nodes

## CompositeNode Component

### Visual layout

```
┌─────────────────────────────────┐
│  Node Title (label)         🔵  │  ← subgraph icon if applicable
├─────────────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐             │  ← layer type tabs
│  │ F │ │ I │ │ P │             │     only existing layers shown
│  └───┘ └───┘ └───┘             │
├─────────────────────────────────┤
│                                 │
│  Q: What is SVD?                │  ← current QA pair (markdown)
│  A: Singular Value Decomp...    │
│                                 │
├─────────────────────────────────┤
│  ◀  1/3  ▶        🟢 🟡 🔴    │  ← QA nav + SRS status dots
└─────────────────────────────────┘
```

### Behavior

- **Layer tabs**: Click to switch layers. Only tabs for existing layer types shown.
- **QA navigation**: Left/right chevrons cycle QA pairs. Counter shows position.
- **SRS dots**: One per QA pair in current layer. Color by `dueDate`:
  - Gray = new (never reviewed)
  - Green = not due soon (high stability)
  - Yellow = due within 24h
  - Red = overdue
- **NodeResizer + 8 handles**: Carried over from current CustomNode.

### Data type

```ts
type CompositeNodeData = {
  label: string;
  subGraphId?: string | null;
  layers: {
    id: string;
    type: 'fact' | 'intuition' | 'proof';
    title: string | null;
    order: number;
    qaPairs: {
      id: string;
      question: string;
      answer: string;
      order: number;
      card: {
        state: string;
        dueDate: string | null;
        stability: number;
      } | null;
    }[];
  }[];
  onResizeEnd?: (w: number, h: number) => void;
};
```

## tRPC Routers

### Modified `nodes` router

- `listByGraph`: Joins node_layers → layer_qa_pairs → cards. Returns nested structure.
- `create`: No content field. Creates bare node (label + position).
- `update`: Node-level fields only (label, position, dimensions, subGraphId).
- `delete`: Cascade handles cleanup.

### New `nodeLayers` router

- `create`: `{ nodeId, type, title?, order }`
- `update`: `{ id, title?, order?, type? }`
- `delete`: `{ id }` → cascade
- `reorder`: `{ nodeId, layerIds[] }` → batch order update

### New `qaPairs` router

- `create`: `{ layerId, question, answer, order }` → also auto-creates a card in `state: 'new'`
- `update`: `{ id, question?, answer?, order? }`
- `delete`: `{ id }` → cascade
- `reorder`: `{ layerId, pairIds[] }` → batch order update

### New `cards` router

- `listDue`: `{ graphId?, folderId?, limit? }` → due cards with QA content, layer type, node label
- `review`: `{ cardId, rating }` → run FSRS, update card, create review_log

### New `reviewLogs` router

- `listByCard`: `{ cardId }` → review history

## Review Page (`/review`)

Separate route. Fetches due cards across graphs. Shows question → user reveals answer → rates 1-4 → FSRS updates card → next card.

## Data Flow

```
Graph page load:
  nodes.listByGraph → nodes[] with layers[] with qaPairs[] with card{}
  → transform to React Flow nodes
  → CompositeNode renders with full nested data

Edit panel (node selected):
  nodeLayers.create/update/delete → invalidate nodes.listByGraph
  qaPairs.create/update/delete → invalidate nodes.listByGraph

Review page:
  cards.listDue → due cards with QA content
  cards.review(cardId, rating) → FSRS update + review_log entry
```
