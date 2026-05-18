<!-- markdownlint-disable -->

<div align="center">

> *"The only true wisdom is in knowing you know nothing."* — Socrates

</div>

# 📚 wiki-vault

*Lightweight knowledge vault MCP server for structured wiki compilation.*

**wiki-vault is not a note-taking app.** It is a structured knowledge substrate — a typed graph of interconnected research artifacts that grows autonomously as AI agents compile findings. BM25 search, typed edges, batch validation, zero LLM dependencies. The vault is the persistent memory layer where research knowledge crystallizes into reusable structure.

---

## ⚡ What It Does

- 🔍 **BM25 full-text search** — ranked retrieval across all vault pages with type/tag filters and contextual snippets
- 🕸️ **Typed knowledge graph** — 10 edge types connecting 9 entity types, with BFS traversal and orphan detection
- 🩺 **Batch validation** — 5 check types (broken links, orphans, missing frontmatter, duplicate edges, stale index) with auto-fix
- 📊 **Graph statistics** — global metrics (density, orphans, type distribution) and per-node connectivity analysis
- 🔄 **Incremental indexing** — only re-indexes changed files, full rebuild available on demand
- 📖 **Obsidian-compatible** — standard markdown + YAML frontmatter + `[[wikilinks]]`, browsable without modification

---

## 🎯 Design Philosophy

- **Single unified vault.** All knowledge in one place regardless of research domain. Cross-domain connections emerge naturally from the graph.
- **CC handles CRUD directly.** File creation, editing, deletion are CC's native operations. The MCP server provides only what CC cannot do efficiently: ranked search, graph traversal, batch validation.
- **Sources are immutable.** Raw material is preserved verbatim. Synthesis and evolution happen in wiki pages.
- **Graph is first-class.** Every page connects via typed edges. Orphans are failures, not features.
- **兵法书, not pipeline.** Skills teach principles and provide SOPs — CC decides strategy and execution autonomously.

---

## 🏗️ Architecture

```bash
┌─────────────────────────────────────────────────────────┐
│  MCP Server (7 tools)                                   │
│  vault_search · vault_add_edge · vault_query_graph      │
│  vault_graph_stats · vault_lint · vault_index           │
│  vault_info                                             │
├─────────────────────────────────────────────────────────┤
│  Core Modules                                           │
│  index.ts (BM25) · graph.ts (edges+traversal) · lint.ts│
├─────────────────────────────────────────────────────────┤
│  Vault (filesystem)                                     │
│  9 entity dirs · _edges.jsonl · _index.json · _schema.md│
└─────────────────────────────────────────────────────────┘
```

### Tools

| Tool | Description |
|------|-------------|
| `vault_search` | BM25 full-text search with type/tag filters and snippets |
| `vault_add_edge` | Create typed edge between pages (validates, deduplicates) |
| `vault_query_graph` | BFS traversal from node with direction/depth/type filters |
| `vault_graph_stats` | Global or per-node graph statistics and orphan detection |
| `vault_lint` | Batch validation (5 check types) with optional auto-fix |
| `vault_index` | Rebuild search index (incremental or full) |
| `vault_info` | Returns vault metadata (root, directories, types, stats) for session init |

### Skills (8)

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

### Entity Types

| Type | Directory | Purpose |
|------|-----------|---------|
| source | sources/ | Immutable raw material |
| concept | concepts/ | Synthesized understanding |
| entity | entities/ | Named entities (people, orgs, tools) |
| claim | claims/ | Testable assertions with confidence |
| relation | relations/ | Named relationships |
| question | questions/ | Open research questions |
| evidence | evidence/ | Supporting/refuting evidence |
| failure | failures/ | Documented failed approaches |
| topic | topics/ | High-level topic containers |

### Edge Types

| Edge Type | Semantics |
|-----------|-----------|
| component_of | A is part of B |
| instance_of | A is an example of B |
| supported_by | A has evidence from B |
| contradicts | A conflicts with B |
| supersedes | A replaces B |
| derived_from | A was built from B |
| addresses | A answers/solves B |
| raises | A creates/implies B |
| failed_for | A didn't work for B |
| related_to | Weak association |

---

## 🚀 Quick Start

```bash
# Install
npm install

# Run tests (77 tests)
npm test

# Start MCP server
VAULT_ROOT=/path/to/vault npx @yogsoth-ai/wiki-vault
```

### MCP Configuration

Add to your `.mcp.json`:

```json
{
  "wiki-vault": {
    "type": "stdio",
    "command": "npx",
    "args": ["@yogsoth-ai/wiki-vault"],
    "env": { "VAULT_ROOT": "/path/to/your/vault" }
  }
}
```

---

## 📄 License

[Apache-2.0](LICENSE)

---

*Part of the [Yogsoth AI](https://github.com/yogsoth-ai) ecosystem. Built by [Pthahnix](https://github.com/Pthahnix).*
