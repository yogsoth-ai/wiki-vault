#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getVaultRoot, ensureVaultDirs } from './vault.js';
import { vaultSearch } from './tools/vault-search.js';
import { vaultAddEdge } from './tools/vault-add-edge.js';
import { vaultQueryGraph } from './tools/vault-query-graph.js';
import { vaultGraphStats } from './tools/vault-graph-stats.js';
import { vaultLint } from './tools/vault-lint.js';
import { vaultIndex } from './tools/vault-index.js';
import { vaultInfo } from './tools/vault-info.js';
import { vaultEdgeAudit } from './tools/vault-edge-audit.js';

const server = new McpServer({
  name: 'wiki-vault',
  version: '1.2.1',
});

const vaultRoot = getVaultRoot();
ensureVaultDirs(vaultRoot);

server.tool(
  'vault_search',
  'BM25 full-text search across all wiki pages. Returns ranked results with path, title, type, score, snippet.',
  {
    query: z.string().describe('Search query'),
    type: z.array(z.string()).optional().describe('Filter by entity types'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    limit: z.number().optional().describe('Max results (default 20)'),
  },
  async ({ query, type, tags, limit }) => {
    const result = await vaultSearch(vaultRoot, query, type, tags, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'vault_add_edge',
  'Add a typed edge to the knowledge graph. Validates paths exist, rejects duplicates.',
  {
    source: z.string().describe('Source page path relative to vault root'),
    target: z.string().describe('Target page path relative to vault root'),
    edge_type: z.string().describe('Edge type (e.g., component_of, supported_by)'),
    weight: z.number().optional().describe('Edge weight 0.0-1.0 (default 1.0)'),
    metadata: z.record(z.unknown()).optional().describe('Optional metadata'),
  },
  async ({ source, target, edge_type, weight }) => {
    const result = await vaultAddEdge(vaultRoot, source, target, edge_type, weight);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'vault_query_graph',
  'Traverse the knowledge graph from a given node. Returns subgraph of nodes and edges.',
  {
    node: z.string().describe('Starting node path relative to vault root'),
    direction: z.enum(['in', 'out', 'both']).describe('Traversal direction'),
    edge_type: z.string().optional().describe('Filter by edge type'),
    depth: z.number().optional().describe('Traversal depth (default 1, max 3)'),
  },
  async ({ node, direction, edge_type, depth }) => {
    const result = await vaultQueryGraph(vaultRoot, node, direction, edge_type, depth);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'vault_graph_stats',
  'Get graph statistics. Without node: global stats. With node: local connectivity.',
  {
    node: z.string().optional().describe('Specific node path for local stats'),
  },
  async ({ node }) => {
    const result = await vaultGraphStats(vaultRoot, node);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'vault_lint',
  'Batch validation of vault health. Checks broken links, orphans, missing frontmatter, duplicate edges.',
  {
    fix: z.boolean().optional().describe('Auto-fix safe issues (default false)'),
  },
  async ({ fix }) => {
    const result = await vaultLint(vaultRoot, fix);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'vault_index',
  'Rebuild BM25 search index. Default incremental, full option available.',
  {
    full: z.boolean().optional().describe('Full rebuild (default false = incremental)'),
  },
  async ({ full }) => {
    const result = await vaultIndex(vaultRoot, full);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'vault_info',
  'Returns vault metadata: root path, directory conventions, entity/edge types, and current stats. Call at session start to learn vault location.',
  {},
  async () => {
    const result = await vaultInfo(vaultRoot);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  'vault_edge_audit',
  'Scan all edges in _edges.jsonl and check whether each source page contains a [[dir/slug]] wikilink to the target. Returns coverage stats and list of missing wikilinks.',
  {},
  async () => {
    const result = await vaultEdgeAudit(vaultRoot);
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
