---
name: wiki-vault
description: Knowledge vault MCP server + companion skills for structured wiki compilation. Use this skill whenever you need to search, query, lint, or compile knowledge into the vault. Provides 6 MCP tools for ranked search, graph traversal, and batch validation, plus 8 skills (2 tactics + 6 SOPs) for knowledge compilation workflows.
---

# Wiki Vault

Lightweight knowledge vault with structured graph, BM25 search, and batch validation. The vault stores research knowledge as interconnected markdown pages following the Karpathy llm-wiki pattern: Sources (immutable raw material) → Wiki (LLM-maintained synthesis) → Schema (configuration).

## Philosophy

- **Single unified vault.** All knowledge lives in one vault regardless of research domain. Cross-domain connections emerge naturally.
- **CC handles CRUD directly.** File creation, editing, and deletion are CC's native operations. The MCP server provides only what CC cannot do efficiently: ranked search, graph traversal, batch validation, and index maintenance.
- **Obsidian-compatible.** Pages use standard markdown with YAML frontmatter and `[[wikilinks]]`. The vault is browsable in Obsidian without modification.
- **Graph is first-class.** Every page should connect to the knowledge graph via typed edges. Orphans are failures.

## Four-Level Hierarchy

```
ENTRY.md (this file)
  → Tactic (2): multi-step orchestration patterns
    → SOP (6): single-responsibility operations
      → Tool (6): atomic MCP operations
```

## Skill Routing

| Signal | Skill |
|--------|-------|
| 编译研究成果、compile findings、ingest material | → knowledge-compilation (tactic) |
| vault 健康检查、lint、orphan cleanup、merge duplicates | → vault-maintenance (tactic) |
| 搜索 vault、find pages、check duplicates | → wiki-search (SOP) |
| 图谱查询、explore neighborhood、find connections | → wiki-graph-query (SOP) |
| 添加关系、create edge、link pages | → wiki-add-edge (SOP) |
| 导入源材料、ingest source、capture raw material | → wiki-ingest-source (SOP) |
| 创建/更新页面、compile page、synthesize | → wiki-compile-page (SOP) |
| 运行 lint、fix issues、validate vault | → wiki-lint-fix (SOP) |

## MCP Tools (6)

| Tool | Purpose |
|------|---------|
| `vault_search` | BM25 full-text search with type/tag filters |
| `vault_add_edge` | Create typed edge (validates paths, rejects duplicates) |
| `vault_query_graph` | BFS traversal from node (direction, depth, edge_type filter) |
| `vault_graph_stats` | Global or per-node graph statistics |
| `vault_lint` | Batch validation with optional auto-fix |
| `vault_index` | Rebuild BM25 index (incremental or full) |

## Entity Types (9)

| Type | Directory | Purpose |
|------|-----------|---------|
| source | sources/ | Immutable raw material (papers, web content, data) |
| concept | concepts/ | Synthesized understanding of a topic |
| entity | entities/ | Named entities (people, orgs, tools, datasets) |
| claim | claims/ | Testable assertions with confidence scores |
| relation | relations/ | Named relationships between concepts |
| question | questions/ | Open research questions |
| evidence | evidence/ | Supporting/refuting evidence with confidence |
| failure | failures/ | Documented failed approaches |
| topic | topics/ | High-level topic containers |

## Edge Types (10)

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

## Read/Write Rules

- **CC writes files directly.** Page creation, editing, deletion — all via CC's native file tools.
- **MCP for queries only.** Search, graph traversal, stats, lint — operations that need index/graph state.
- **Sources are immutable.** Once created, source pages are never edited.
- **Wiki pages evolve.** Updated as understanding deepens, confidence changes, new evidence arrives.
- **Always search before creating.** Deduplication is a pre-condition for page creation.

## Context-Management Integration

- **Campaign start**: `context-init` (load/create campaign context file)
- **After each strategy completes**: `context-checkpoint` + `knowledge-compilation`
- **Vault state persists across sessions** via the file system — no special serialization needed
