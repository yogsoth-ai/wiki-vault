import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultAddEdge } from '../../src/tools/vault-add-edge.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-add-edge-test-${Date.now()}`);

describe('vault-add-edge tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(join(TEST_VAULT, 'concepts/a.md'), '---\ntitle: "A"\ntype: concept\ntags: []\n---\n');
    writeFileSync(join(TEST_VAULT, 'concepts/b.md'), '---\ntitle: "B"\ntype: concept\ntags: []\n---\n');
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('creates edge successfully', async () => {
    const result = await vaultAddEdge(TEST_VAULT, 'concepts/a.md', 'concepts/b.md', 'component_of');
    expect(result.success).toBe(true);
    expect(result.edge_count).toBe(1);
  });

  it('rejects when source does not exist', async () => {
    const result = await vaultAddEdge(TEST_VAULT, 'concepts/nonexist.md', 'concepts/b.md', 'component_of');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Source path does not exist');
  });

  it('rejects when target does not exist', async () => {
    const result = await vaultAddEdge(TEST_VAULT, 'concepts/a.md', 'concepts/nonexist.md', 'component_of');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Target path does not exist');
  });

  it('rejects duplicate edge', async () => {
    await vaultAddEdge(TEST_VAULT, 'concepts/a.md', 'concepts/b.md', 'component_of');
    const result = await vaultAddEdge(TEST_VAULT, 'concepts/a.md', 'concepts/b.md', 'component_of');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Duplicate edge');
  });

  it('allows same pair with different edge type', async () => {
    await vaultAddEdge(TEST_VAULT, 'concepts/a.md', 'concepts/b.md', 'component_of');
    const result = await vaultAddEdge(TEST_VAULT, 'concepts/a.md', 'concepts/b.md', 'derived_from');
    expect(result.success).toBe(true);
    expect(result.edge_count).toBe(2);
  });
});
