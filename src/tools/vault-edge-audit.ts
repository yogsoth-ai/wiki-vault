import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEdges } from '../graph.js';

export interface EdgeAuditResult {
  total_edges: number;
  covered: number;
  missing_count: number;
  missing: Array<{
    source: string;
    target: string;
    edge_type: string;
    expected_wikilink: string;
  }>;
}

function targetToWikilink(targetPath: string): string {
  return '[[' + targetPath.replace(/\.md$/, '') + ']]';
}

export async function vaultEdgeAudit(vaultRoot: string): Promise<EdgeAuditResult> {
  const edges = loadEdges(vaultRoot);
  const missing: EdgeAuditResult['missing'] = [];
  let covered = 0;

  for (const edge of edges) {
    const expectedWikilink = targetToWikilink(edge.target);
    const sourcePath = join(vaultRoot, edge.source);

    if (!existsSync(sourcePath)) {
      missing.push({
        source: edge.source,
        target: edge.target,
        edge_type: edge.edge_type,
        expected_wikilink: expectedWikilink,
      });
      continue;
    }

    const content = readFileSync(sourcePath, 'utf-8');
    if (content.includes(expectedWikilink)) {
      covered++;
    } else {
      missing.push({
        source: edge.source,
        target: edge.target,
        edge_type: edge.edge_type,
        expected_wikilink: expectedWikilink,
      });
    }
  }

  return {
    total_edges: edges.length,
    covered,
    missing_count: missing.length,
    missing,
  };
}
