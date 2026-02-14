import type { GeneratedGraph } from "./gemini";

const X_SPACING = 250;
const Y_SPACING = 150;

export function computeLayeredPositions(
  graph: GeneratedGraph,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (graph.nodes.length === 0) return positions;

  // Build adjacency + incoming-edge count
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of graph.nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of graph.edges) {
    children.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  // BFS from root nodes (no incoming edges)
  const roots = graph.nodes
    .map((n) => n.id)
    .filter((id) => (inDegree.get(id) ?? 0) === 0);

  // If no roots (cycle), pick first node
  if (roots.length === 0) roots.push(graph.nodes[0]!.id);

  const visited = new Set<string>();
  const layers: string[][] = [];
  let queue = [...roots];

  while (queue.length > 0) {
    layers.push(queue);
    for (const id of queue) visited.add(id);

    const next: string[] = [];
    for (const id of queue) {
      for (const child of children.get(id) ?? []) {
        if (!visited.has(child)) {
          visited.add(child);
          next.push(child);
        }
      }
    }
    queue = next;
  }

  // Append orphans (not reached by BFS) as final layer
  const orphans = graph.nodes
    .map((n) => n.id)
    .filter((id) => !visited.has(id));
  if (orphans.length > 0) layers.push(orphans);

  // Assign positions: layers go top-to-bottom, nodes centered horizontally
  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx]!;
    const totalWidth = (layer.length - 1) * X_SPACING;
    const startX = -totalWidth / 2;
    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      positions.set(layer[nodeIdx]!, {
        x: startX + nodeIdx * X_SPACING,
        y: layerIdx * Y_SPACING,
      });
    }
  }

  return positions;
}
