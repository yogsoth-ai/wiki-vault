import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultGraphStats } from '../../src/tools/vault-graph-stats.js';
import { appendEdge } from '../../src/graph.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-graph-stats-test-${Date.now()}`);

describe('vault-graph-stats tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    mkdirSync(join(TEST_VAULT, 'claims'), { recursive: true });
    writeFileSync(join(TEST_VAULT, 'concepts/a.md'), '');
    writeFileSync(join(TEST_VAULT, 'concepts/b.md'), '');
    writeFileSync(join(TEST_VAULT, 'concepts/c.md'), '');
    writeFileSync(join(TEST_VAULT, 'claims/d.md'), '');

    appendEdge(TEST_VAULT, { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' });
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('returns global stats without node param', async () => {
    const stats = await vaultGraphStats(TEST_VAULT) as any;
    expect(stats.total_nodes).toBe(4);
    expect(stats.total_edges).toBe(1);
    expect(stats.orphan_nodes).toContain('concepts/c.md');
    expect(stats.orphan_nodes).toContain('claims/d.md');
  });

  it('returns node stats with node param', async () => {
    const stats = await vaultGraphStats(TEST_VAULT, 'concepts/b.md') as any;
    expect(stats.node).toBe('concepts/b.md');
    expect(stats.in_degree).toBe(1);
    expect(stats.out_degree).toBe(0);
    expect(stats.neighbors).toContain('concepts/a.md');
  });
});
