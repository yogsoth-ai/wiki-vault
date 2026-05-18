import { loadEdges, appendEdge, isDuplicate, pathExists, Edge } from '../graph.js';

export async function vaultAddEdge(
  vaultRoot: string,
  source: string,
  target: string,
  edgeType: string,
  weight?: number,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; edge_count: number; error?: string }> {
  if (!pathExists(vaultRoot, source)) {
    return { success: false, edge_count: 0, error: `Source path does not exist: ${source}` };
  }
  if (!pathExists(vaultRoot, target)) {
    return { success: false, edge_count: 0, error: `Target path does not exist: ${target}` };
  }

  const edges = loadEdges(vaultRoot);

  if (isDuplicate(edges, source, target, edgeType)) {
    return { success: false, edge_count: edges.length, error: `Duplicate edge: ${source} -[${edgeType}]-> ${target}` };
  }

  const edge: Edge = {
    source,
    target,
    edge_type: edgeType,
    weight: weight ?? 1.0,
    created: new Date().toISOString().slice(0, 10),
  };
  if (metadata) edge.metadata = metadata;

  appendEdge(vaultRoot, edge);

  return { success: true, edge_count: edges.length + 1 };
}
