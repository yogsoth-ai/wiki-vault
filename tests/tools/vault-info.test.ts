import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultInfo } from '../../src/tools/vault-info.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-info-test-${Date.now()}`);

describe('vault-info tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('returns correct root path', async () => {
    const info = await vaultInfo(TEST_VAULT);
    expect(info.root).toBe(TEST_VAULT);
  });

  it('returns directory conventions', async () => {
    const info = await vaultInfo(TEST_VAULT);
    expect(info.directories).toEqual({
      sources: 'sources/',
      wiki: 'wiki/',
      schema: 'schema/',
    });
  });

  it('returns 9 entity types', async () => {
    const info = await vaultInfo(TEST_VAULT);
    expect(info.entity_types).toHaveLength(9);
    expect(info.entity_types).toContain('sources');
    expect(info.entity_types).toContain('topics');
  });

  it('returns 10 edge types', async () => {
    const info = await vaultInfo(TEST_VAULT);
    expect(info.edge_types).toHaveLength(10);
    expect(info.edge_types).toContain('component_of');
    expect(info.edge_types).toContain('related_to');
  });

  it('returns all stats as 0 for empty vault', async () => {
    const info = await vaultInfo(TEST_VAULT);
    expect(info.stats).toEqual({
      pages: 0,
      edges: 0,
      index_entries: 0,
    });
  });

  it('counts .md pages excluding _ prefixed files', async () => {
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    mkdirSync(join(TEST_VAULT, 'claims'), { recursive: true });
    writeFileSync(join(TEST_VAULT, 'concepts/attention.md'), '# Attention');
    writeFileSync(join(TEST_VAULT, 'concepts/transformer.md'), '# Transformer');
    writeFileSync(join(TEST_VAULT, 'claims/claim-1.md'), '# Claim 1');
    writeFileSync(join(TEST_VAULT, '_schema.md'), '# Schema');

    const info = await vaultInfo(TEST_VAULT);
    expect(info.stats.pages).toBe(3);
  });

  it('counts edges from _edges.jsonl', async () => {
    const edge1 = JSON.stringify({ source: 'a.md', target: 'b.md', edge_type: 'related_to', weight: 1, created: '2026-01-01' });
    const edge2 = JSON.stringify({ source: 'b.md', target: 'c.md', edge_type: 'component_of', weight: 1, created: '2026-01-01' });
    writeFileSync(join(TEST_VAULT, '_edges.jsonl'), edge1 + '\n' + edge2 + '\n');

    const info = await vaultInfo(TEST_VAULT);
    expect(info.stats.edges).toBe(2);
  });

  it('counts index entries from _index.json', async () => {
    const index = { entries: { 'concepts/a.md': {}, 'concepts/b.md': {}, 'claims/c.md': {} }, idf: {}, lastBuild: 0 };
    writeFileSync(join(TEST_VAULT, '_index.json'), JSON.stringify(index));

    const info = await vaultInfo(TEST_VAULT);
    expect(info.stats.index_entries).toBe(3);
  });

  it('returns 0 edges when _edges.jsonl missing', async () => {
    const info = await vaultInfo(TEST_VAULT);
    expect(info.stats.edges).toBe(0);
  });

  it('returns 0 index_entries when _index.json missing', async () => {
    const info = await vaultInfo(TEST_VAULT);
    expect(info.stats.index_entries).toBe(0);
  });
});
