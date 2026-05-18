# Integration Prompt — wiki-vault

Use these scenarios to verify end-to-end behavior. Run each scenario in a fresh vault (set `VAULT_ROOT` to a temp directory).

## Scenario 1: Basic Search

1. Create 3 concept pages manually:
   - `concepts/transformer.md` — content about transformer architecture
   - `concepts/attention.md` — content about attention mechanisms
   - `concepts/mlp.md` — content about multi-layer perceptrons
2. Call `vault_index` (full rebuild)
3. Call `vault_search` with query "attention mechanism"
4. **Expected:** `concepts/attention.md` ranks first, `concepts/transformer.md` may appear (mentions attention)

## Scenario 2: Edge Creation + Graph Query

1. Create 3 concept pages (as above)
2. Call `vault_add_edge`: source=concepts/attention.md, target=concepts/transformer.md, edge_type=component_of
3. Call `vault_add_edge`: source=concepts/mlp.md, target=concepts/transformer.md, edge_type=component_of
4. Call `vault_query_graph`: node=concepts/transformer.md, direction=in, depth=1
5. **Expected:** Returns subgraph with 3 nodes (transformer, attention, mlp) and 2 edges
6. Call `vault_add_edge` with same source/target/type as step 2
7. **Expected:** Duplicate rejection (success=false)

## Scenario 3: Lint Detect + Fix

1. Create pages with issues:
   - `concepts/broken.md` — contains `[[concepts/nonexist]]` wikilink
   - `concepts/orphan.md` — no inbound links or edges
   - `claims/noconf.md` — type=claim but missing confidence field
2. Add a duplicate edge (same source/target/type twice)
3. Call `vault_lint` with fix=false
4. **Expected:** Reports broken wikilink (error), orphan (warning), missing frontmatter (error), duplicate edge (warning)
5. Call `vault_lint` with fix=true
6. **Expected:** Duplicate edge fixed, other issues remain (require manual resolution)

## Scenario 4: Full Index Rebuild

1. Create 5 pages across different entity types
2. Call `vault_index` with full=true
3. **Expected:** Returns stats showing 5 pages indexed
4. Delete one page manually
5. Call `vault_index` with full=false (incremental)
6. **Expected:** Index updated, deleted page removed

## Scenario 5: Knowledge Compilation Flow

1. Simulate a research session producing findings about "graph neural networks"
2. Use `wiki-search` SOP to check for existing coverage
3. Use `wiki-ingest-source` SOP to create a source page from paper notes
4. Use `wiki-compile-page` SOP to create a concept page synthesizing the findings
5. Use `wiki-add-edge` SOP to connect concept → source (supported_by)
6. Use `wiki-lint-fix` SOP to verify no issues introduced
7. **Expected:** Source page immutable, concept page with wikilinks, edge in graph, clean lint
