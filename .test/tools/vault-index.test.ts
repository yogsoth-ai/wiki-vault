import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultIndex } from '../../src/tools/vault-index.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-index-tool-test-${Date.now()}`);

function writeTestPage(relPath: string, content: string) {
  const fullPath = join(TEST_VAULT, relPath);
  const dir = fullPath.replace(/[/\\][^/\\]+$/, '');
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('vault-index tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('builds index and returns stats', async () => {
    writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nContent A');
    writeTestPage('concepts/b.md', '---\ntitle: "B"\ntype: concept\ntags: []\n---\nContent B');

    const result = await vaultIndex(TEST_VAULT, true);
    expect(result.indexed).toBe(2);
    expect(result.removed).toBe(0);
    expect(existsSync(join(TEST_VAULT, '_index.json'))).toBe(true);
  });

  it('incremental build detects removed files', async () => {
    writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nContent A');
    writeTestPage('concepts/b.md', '---\ntitle: "B"\ntype: concept\ntags: []\n---\nContent B');

    await vaultIndex(TEST_VAULT, true);

    rmSync(join(TEST_VAULT, 'concepts/b.md'));

    const result = await vaultIndex(TEST_VAULT, false);
    expect(result.indexed).toBe(1);
    expect(result.removed).toBe(1);
  });

  it('full rebuild reindexes all files', async () => {
    writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nContent A');
    await vaultIndex(TEST_VAULT, true);

    writeTestPage('concepts/b.md', '---\ntitle: "B"\ntype: concept\ntags: []\n---\nContent B');
    const result = await vaultIndex(TEST_VAULT, true);

    expect(result.indexed).toBe(2);
  });
});
