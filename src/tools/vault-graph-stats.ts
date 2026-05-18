import { loadEdges, computeGlobalStats, computeNodeStats } from '../graph.js';

export async function vaultGraphStats(vaultRoot: string, node?: string) {
  const edges = loadEdges(vaultRoot);

  if (node) {
    return computeNodeStats(edges, node);
  }

  return computeGlobalStats(vaultRoot, edges);
}
