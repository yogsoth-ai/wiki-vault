import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultQueryGraph } from '../../src/tools/vault-query-graph.js';
import { appendEdge, Edge } from '../../src/graph.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-query-graph-test-${Date.now()}`);

function addEdge(source: string, target: string, edgeType: string) {
  appendEdge(TEST_VAULT, { source, target, edge_type: edgeType, weight: 1.0, created: '2026-05-18' });
}

describe('vault-query-graph tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(join(TEST_VAULT, 'concepts/a.md'), '');
    writeFileSync(join(TEST_VAULT, 'concepts/b.md'), '');
    writeFileSync(join(TEST_VAULT, 'concepts/c.md'), '');

    addEdge('concepts/a.md', 'concepts/b.md', 'component_of');
    addEdge('concepts/b.md', 'concepts/c.md', 'derived_from');
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('queries outgoing at default depth 1', async () => {
    const result = await vaultQueryGraph(TEST_VAULT, 'concepts/a.md', 'out');
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  it('queries at depth 2', async () => {
    const result = await vaultQueryGraph(TEST_VAULT, 'concepts/a.md', 'out', undefined, 2);
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
  });

  it('clamps depth to max 3', async () => {
    const result = await vaultQueryGraph(TEST_VAULT, 'concepts/a.md', 'out', undefined, 10);
    expect(result.nodes.length).toBeLessThanOrEqual(3);
  });

  it('filters by edge type', async () => {
    const result = await vaultQueryGraph(TEST_VAULT, 'concepts/a.md', 'out', 'derived_from', 2);
    expect(result.edges).toHaveLength(0);
  });
});
