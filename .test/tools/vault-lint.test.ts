import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultLint } from '../../src/tools/vault-lint.js';
import { appendEdge } from '../../src/graph.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-lint-tool-test-${Date.now()}`);

describe('vault-lint tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(join(TEST_VAULT, 'concepts/a.md'), '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\nSee [[concepts/ghost]]');
    writeFileSync(join(TEST_VAULT, 'concepts/b.md'), '---\ntitle: B\n---\n');
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('returns structured lint summary', async () => {
    const result = await vaultLint(TEST_VAULT) as any;
    expect(result.total).toBeGreaterThan(0);
    expect(result.errors).toBeGreaterThan(0);
    expect(typeof result.warnings).toBe('number');
    expect(result.fixed).toBe(0);
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('fixes issues when fix=true', async () => {
    appendEdge(TEST_VAULT, { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' });
    appendEdge(TEST_VAULT, { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' });

    const result = await vaultLint(TEST_VAULT, true) as any;
    expect(result.fixed).toBeGreaterThan(0);
  });
});
