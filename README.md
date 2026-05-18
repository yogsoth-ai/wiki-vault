# 📚 wiki-vault

> *"Knowledge is of no value unless you put it into practice."* — Anton Chekhov

Lightweight knowledge vault MCP server for structured wiki compilation. BM25 search, typed knowledge graph, batch validation — all in a single TypeScript package with zero LLM dependencies.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  MCP Server (6 tools)                           │
│  vault_search · vault_add_edge · vault_query_graph │
│  vault_graph_stats · vault_lint · vault_index   │
├─────────────────────────────────────────────────┤
│  Core Modules                                   │
│  index.ts (BM25) · graph.ts (edges) · lint.ts  │
├─────────────────────────────────────────────────┤
│  Vault (filesystem)                             │
│  9 entity dirs · _edges.jsonl · _index.json     │
└─────────────────────────────────────────────────┘
```

## Tools

| Tool | Description |
|------|-------------|
| `vault_search` | BM25 full-text search with type/tag filters and snippets |
| `vault_add_edge` | Create typed edge between pages (validates, deduplicates) |
| `vault_query_graph` | BFS traversal from node with direction/depth/type filters |
| `vault_graph_stats` | Global or per-node graph statistics and orphan detection |
| `vault_lint` | Batch validation (5 check types) with optional auto-fix |
| `vault_index` | Rebuild search index (incremental or full) |

## Skills (8)

| Level | Skill | Purpose |
|-------|-------|---------|
| Tactic | knowledge-compilation | Compile research findings into vault pages |
| Tactic | vault-maintenance | Vault health upkeep and cleanup |
| SOP | wiki-search | Search before creating (deduplication) |
| SOP | wiki-graph-query | Explore node neighborhood |
| SOP | wiki-add-edge | Create typed relationships |
| SOP | wiki-ingest-source | Write immutable source pages |
| SOP | wiki-compile-page | Create/update synthesized pages |
| SOP | wiki-lint-fix | Run lint and optionally fix |

## Quick Start

```bash
# Install
npm install

# Run tests
npm test

# Start MCP server
VAULT_ROOT=/path/to/vault npx tsx src/server.ts
```

### MCP Configuration

Add to your `.mcp.json`:

```json
{
  "wiki-vault": {
    "command": "npx",
    "args": ["tsx", "src/server.ts"],
    "env": { "VAULT_ROOT": "/path/to/your/vault" }
  }
}
```

## Entity Types

sources · concepts · entities · claims · relations · questions · evidence · failures · topics

## Edge Types

component_of · instance_of · supported_by · contradicts · supersedes · derived_from · addresses · raises · failed_for · related_to

## Design Principles

- **Single unified vault** — all knowledge in one place, cross-domain connections emerge naturally
- **CC handles CRUD** — MCP only provides ranked search, graph traversal, batch validation
- **Obsidian-compatible** — standard markdown + YAML frontmatter + `[[wikilinks]]`
- **Graph is first-class** — every page connects via typed edges, orphans are failures
- **Sources are immutable** — raw material preserved verbatim, synthesis in wiki pages

## License

MIT
