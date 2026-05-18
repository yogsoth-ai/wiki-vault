import { loadEdges, queryGraph } from '../graph.js';

export async function vaultQueryGraph(
  vaultRoot: string,
  node: string,
  direction: 'in' | 'out' | 'both',
  edgeType?: string,
  depth?: number,
) {
  const clampedDepth = Math.min(Math.max(depth ?? 1, 1), 3);
  const edges = loadEdges(vaultRoot);
  return queryGraph(edges, node, direction, edgeType, clampedDepth);
}
