import { readFileSync, appendFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface Edge {
  source: string;
  target: string;
  edge_type: string;
  weight: number;
  metadata?: Record<string, unknown>;
  created: string;
}

export interface GraphNode {
  path: string;
  title: string;
  type: string;
}

export interface Subgraph {
  nodes: GraphNode[];
  edges: Edge[];
}

export interface GlobalStats {
  total_nodes: number;
  total_edges: number;
  orphan_nodes: string[];
  edge_type_distribution: Record<string, number>;
}

export interface NodeStats {
  node: string;
  in_degree: number;
  out_degree: number;
  edge_types: string[];
  neighbors: string[];
}

const EDGES_FILE = '_edges.jsonl';

export function getEdgesPath(vaultRoot: string): string {
  return join(vaultRoot, EDGES_FILE);
}

export function loadEdges(vaultRoot: string): Edge[] {
  const edgesPath = getEdgesPath(vaultRoot);
  if (!existsSync(edgesPath)) return [];

  const content = readFileSync(edgesPath, 'utf-8').trim();
  if (!content) return [];

  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Edge);
}

export function appendEdge(vaultRoot: string, edge: Edge): void {
  const edgesPath = getEdgesPath(vaultRoot);
  const line = JSON.stringify(edge) + '\n';
  appendFileSync(edgesPath, line, 'utf-8');
}

export function writeEdges(vaultRoot: string, edges: Edge[]): void {
  const edgesPath = getEdgesPath(vaultRoot);
  const content = edges.map((e) => JSON.stringify(e)).join('\n') + (edges.length ? '\n' : '');
  writeFileSync(edgesPath, content, 'utf-8');
}

export function isDuplicate(edges: Edge[], source: string, target: string, edgeType: string): boolean {
  return edges.some((e) => e.source === source && e.target === target && e.edge_type === edgeType);
}

export function pathExists(vaultRoot: string, relPath: string): boolean {
  const fullPath = join(vaultRoot, relPath);
  return existsSync(fullPath);
}

export function queryGraph(
  edges: Edge[],
  node: string,
  direction: 'in' | 'out' | 'both',
  edgeType?: string,
  maxDepth = 1,
): Subgraph {
  const visitedNodes = new Set<string>();
  const resultEdges: Edge[] = [];
  const queue: { path: string; depth: number }[] = [{ path: node, depth: 0 }];

  visitedNodes.add(node);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    for (const edge of edges) {
      if (edgeType && edge.edge_type !== edgeType) continue;

      let neighbor: string | null = null;

      if ((direction === 'out' || direction === 'both') && edge.source === current.path) {
        neighbor = edge.target;
      }
      if ((direction === 'in' || direction === 'both') && edge.target === current.path) {
        neighbor = edge.source;
      }

      if (neighbor && !visitedNodes.has(neighbor)) {
        visitedNodes.add(neighbor);
        resultEdges.push(edge);
        queue.push({ path: neighbor, depth: current.depth + 1 });
      } else if (neighbor && visitedNodes.has(neighbor)) {
        if (!resultEdges.includes(edge)) {
          resultEdges.push(edge);
        }
      }
    }
  }

  const nodes: GraphNode[] = Array.from(visitedNodes).map((path) => ({
    path,
    title: path.split('/').pop()?.replace('.md', '') || path,
    type: path.split('/')[0] || '',
  }));

  return { nodes, edges: resultEdges };
}

export function computeGlobalStats(vaultRoot: string, edges: Edge[]): GlobalStats {
  const allNodes = new Set<string>();
  const nodesWithEdges = new Set<string>();
  const edgeTypeDist: Record<string, number> = {};

  for (const edge of edges) {
    nodesWithEdges.add(edge.source);
    nodesWithEdges.add(edge.target);
    edgeTypeDist[edge.edge_type] = (edgeTypeDist[edge.edge_type] || 0) + 1;
  }

  const dirs = ['sources', 'concepts', 'entities', 'claims', 'relations', 'questions', 'evidence', 'failures', 'topics'];
  for (const dir of dirs) {
    const dirPath = join(vaultRoot, dir);
    if (!existsSync(dirPath)) continue;
    const files = readdirSync(dirPath) as string[];
    for (const file of files) {
      if (file.endsWith('.md')) {
        allNodes.add(`${dir}/${file}`);
      }
    }
  }

  const orphans = Array.from(allNodes).filter((n) => !nodesWithEdges.has(n));

  return {
    total_nodes: allNodes.size,
    total_edges: edges.length,
    orphan_nodes: orphans,
    edge_type_distribution: edgeTypeDist,
  };
}

export function computeNodeStats(edges: Edge[], node: string): NodeStats {
  const inEdges = edges.filter((e) => e.target === node);
  const outEdges = edges.filter((e) => e.source === node);
  const edgeTypes = new Set<string>();
  const neighbors = new Set<string>();

  for (const e of inEdges) {
    edgeTypes.add(e.edge_type);
    neighbors.add(e.source);
  }
  for (const e of outEdges) {
    edgeTypes.add(e.edge_type);
    neighbors.add(e.target);
  }

  return {
    node,
    in_degree: inEdges.length,
    out_degree: outEdges.length,
    edge_types: Array.from(edgeTypes),
    neighbors: Array.from(neighbors),
  };
}
