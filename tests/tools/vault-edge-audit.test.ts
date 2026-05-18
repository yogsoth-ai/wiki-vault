import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vaultEdgeAudit } from '../../src/tools/vault-edge-audit.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-edge-audit-test-${Date.now()}`);

describe('vault-edge-audit tool', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  it('returns all zeros when no edges exist', async () => {
    const result = await vaultEdgeAudit(TEST_VAULT);
    expect(result.total_edges).toBe(0);
    expect(result.covered).toBe(0);
    expect(result.missing_count).toBe(0);
    expect(result.missing).toEqual([]);
  });

  it('reports covered when source contains wikilink to target', async () => {
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(
      join(TEST_VAULT, 'concepts/attention.md'),
      '# Attention\n\nA mechanism used in [[concepts/transformer]].\n',
    );
    writeFileSync(join(TEST_VAULT, 'concepts/transformer.md'), '# Transformer\n');
    const edge = JSON.stringify({
      source: 'concepts/attention.md',
      target: 'concepts/transformer.md',
      edge_type: 'component_of',
      weight: 1,
      created: '2026-01-01',
    });
    writeFileSync(join(TEST_VAULT, '_edges.jsonl'), edge + '\n');

    const result = await vaultEdgeAudit(TEST_VAULT);
    expect(result.total_edges).toBe(1);
    expect(result.covered).toBe(1);
    expect(result.missing_count).toBe(0);
  });

  it('reports missing when source lacks wikilink to target', async () => {
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(join(TEST_VAULT, 'concepts/attention.md'), '# Attention\n\nNo links here.\n');
    writeFileSync(join(TEST_VAULT, 'concepts/transformer.md'), '# Transformer\n');
    const edge = JSON.stringify({
      source: 'concepts/attention.md',
      target: 'concepts/transformer.md',
      edge_type: 'component_of',
      weight: 1,
      created: '2026-01-01',
    });
    writeFileSync(join(TEST_VAULT, '_edges.jsonl'), edge + '\n');

    const result = await vaultEdgeAudit(TEST_VAULT);
    expect(result.total_edges).toBe(1);
    expect(result.covered).toBe(0);
    expect(result.missing_count).toBe(1);
    expect(result.missing[0]).toEqual({
      source: 'concepts/attention.md',
      target: 'concepts/transformer.md',
      edge_type: 'component_of',
      expected_wikilink: '[[concepts/transformer]]',
    });
  });

  it('handles multiple edges with mixed coverage', async () => {
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(
      join(TEST_VAULT, 'concepts/attention.md'),
      '# Attention\n\nUsed in [[concepts/transformer]].\n',
    );
    writeFileSync(join(TEST_VAULT, 'concepts/mlp.md'), '# MLP\n\nA feedforward layer.\n');
    writeFileSync(join(TEST_VAULT, 'concepts/transformer.md'), '# Transformer\n');
    const edges = [
      JSON.stringify({ source: 'concepts/attention.md', target: 'concepts/transformer.md', edge_type: 'component_of', weight: 1, created: '2026-01-01' }),
      JSON.stringify({ source: 'concepts/mlp.md', target: 'concepts/transformer.md', edge_type: 'component_of', weight: 1, created: '2026-01-01' }),
    ];
    writeFileSync(join(TEST_VAULT, '_edges.jsonl'), edges.join('\n') + '\n');

    const result = await vaultEdgeAudit(TEST_VAULT);
    expect(result.total_edges).toBe(2);
    expect(result.covered).toBe(1);
    expect(result.missing_count).toBe(1);
    expect(result.missing[0].source).toBe('concepts/mlp.md');
  });

  it('skips edges where source file does not exist', async () => {
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(join(TEST_VAULT, 'concepts/transformer.md'), '# Transformer\n');
    const edge = JSON.stringify({
      source: 'concepts/nonexistent.md',
      target: 'concepts/transformer.md',
      edge_type: 'component_of',
      weight: 1,
      created: '2026-01-01',
    });
    writeFileSync(join(TEST_VAULT, '_edges.jsonl'), edge + '\n');

    const result = await vaultEdgeAudit(TEST_VAULT);
    expect(result.total_edges).toBe(1);
    expect(result.covered).toBe(0);
    expect(result.missing_count).toBe(1);
  });

  it('detects wikilink with nested directory path', async () => {
    mkdirSync(join(TEST_VAULT, 'wiki/claims'), { recursive: true });
    mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
    writeFileSync(
      join(TEST_VAULT, 'concepts/attention.md'),
      '# Attention\n\nSupports [[wiki/claims/scaling-hypothesis]].\n',
    );
    writeFileSync(join(TEST_VAULT, 'wiki/claims/scaling-hypothesis.md'), '# Scaling\n');
    const edge = JSON.stringify({
      source: 'concepts/attention.md',
      target: 'wiki/claims/scaling-hypothesis.md',
      edge_type: 'supported_by',
      weight: 1,
      created: '2026-01-01',
    });
    writeFileSync(join(TEST_VAULT, '_edges.jsonl'), edge + '\n');

    const result = await vaultEdgeAudit(TEST_VAULT);
    expect(result.total_edges).toBe(1);
    expect(result.covered).toBe(1);
    expect(result.missing_count).toBe(0);
  });

  it('returns empty missing array when _edges.jsonl is empty', async () => {
    writeFileSync(join(TEST_VAULT, '_edges.jsonl'), '');
    const result = await vaultEdgeAudit(TEST_VAULT);
    expect(result.total_edges).toBe(0);
    expect(result.missing).toEqual([]);
  });
});
