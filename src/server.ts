import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getVaultRoot, ensureVaultDirs, ENTITY_TYPES } from './vault.js';

const server = new McpServer({
  name: 'wiki-vault',
  version: '0.1.0',
});

const vaultRoot = getVaultRoot();
ensureVaultDirs(vaultRoot);

// Tools are registered in their respective modules and imported here
// For now, register placeholder descriptions — implementations added in Tasks 3-5

server.tool(
  'vault_search',
  'BM25 full-text search across all wiki pages. Returns ranked results with path, title, type, score, snippet.',
  {
    query: z.string().describe('Search query'),
    type: z.array(z.string()).optional().describe('Filter by entity types'),
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    limit: z.number().optional().describe('Max results (default 20)'),
  },
  async () => ({ content: [{ type: 'text' as const, text: 'Not yet implemented' }] }),
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
  async () => ({ content: [{ type: 'text' as const, text: 'Not yet implemented' }] }),
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
  async () => ({ content: [{ type: 'text' as const, text: 'Not yet implemented' }] }),
);

server.tool(
  'vault_graph_stats',
  'Get graph statistics. Without node: global stats. With node: local connectivity.',
  {
    node: z.string().optional().describe('Specific node path for local stats'),
  },
  async () => ({ content: [{ type: 'text' as const, text: 'Not yet implemented' }] }),
);

server.tool(
  'vault_lint',
  'Batch validation of vault health. Checks broken links, orphans, missing frontmatter, duplicate edges.',
  {
    fix: z.boolean().optional().describe('Auto-fix safe issues (default false)'),
  },
  async () => ({ content: [{ type: 'text' as const, text: 'Not yet implemented' }] }),
);

server.tool(
  'vault_index',
  'Rebuild BM25 search index. Default incremental, full option available.',
  {
    full: z.boolean().optional().describe('Full rebuild (default false = incremental)'),
  },
  async () => ({ content: [{ type: 'text' as const, text: 'Not yet implemented' }] }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
