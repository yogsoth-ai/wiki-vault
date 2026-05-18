import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultSearch } from '../../src/tools/vault-search.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-search-tool-test-${Date.now()}`);

function writeTestPage(relPath: string, content: string) {
  const fullPath = join(TEST_VAULT, relPath);
  const dir = fullPath.replace(/[/\\][^/\\]+$/, '');
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('vault-search tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('searches and returns results with snippets', async () => {
    writeTestPage('concepts/attention.md', `---
title: "Self-Attention"
type: concept
tags: ["transformer", "nlp"]
---

# Self-Attention

Self-attention computes weighted sums of value vectors based on query-key similarity.
`);

    const result = await vaultSearch(TEST_VAULT, 'attention query key');
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toBe('Self-Attention');
    expect(result.results[0].snippet).toBeTruthy();
  });

  it('filters by type', async () => {
    writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nNeural network');
    writeTestPage('claims/b.md', '---\ntitle: "B"\ntype: claim\ntags: []\n---\nNeural network claim');

    const result = await vaultSearch(TEST_VAULT, 'neural network', ['claim']);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe('claim');
  });

  it('returns empty results for no matches', async () => {
    writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nContent');

    const result = await vaultSearch(TEST_VAULT, 'zzzznonexistent');
    expect(result.results).toHaveLength(0);
  });
});
