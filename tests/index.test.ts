import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { tokenize, buildIndex, search, loadIndex, saveIndex } from '../src/index.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-index-test-${Date.now()}`);

function writeTestPage(relPath: string, content: string) {
  const fullPath = join(TEST_VAULT, relPath);
  const dir = fullPath.replace(/[/\\][^/\\]+$/, '');
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

describe('index', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  describe('tokenize', () => {
    it('lowercases and splits on whitespace', () => {
      expect(tokenize('Hello World')).toEqual(['hello', 'world']);
    });

    it('removes single-char tokens', () => {
      expect(tokenize('a b cd ef')).toEqual(['cd', 'ef']);
    });

    it('handles punctuation', () => {
      expect(tokenize('self-attention is great!')).toContain('self-attention');
      expect(tokenize('self-attention is great!')).toContain('great');
    });
  });

  describe('buildIndex', () => {
    it('indexes markdown files', () => {
      writeTestPage('concepts/transformer.md', `---
title: "Transformer"
type: concept
tags: ["nlp", "architecture"]
---

# Transformer

The transformer architecture uses self-attention.
`);

      const index = buildIndex(TEST_VAULT);
      expect(Object.keys(index.entries)).toHaveLength(1);
      expect(index.entries['concepts/transformer.md'].title).toBe('Transformer');
      expect(index.entries['concepts/transformer.md'].type).toBe('concept');
      expect(index.entries['concepts/transformer.md'].tags).toEqual(['nlp', 'architecture']);
    });

    it('skips files starting with underscore', () => {
      writeTestPage('concepts/test.md', '---\ntitle: "Test"\ntype: concept\ntags: []\n---\nContent');
      writeFileSync(join(TEST_VAULT, '_schema.md'), 'schema content');

      const index = buildIndex(TEST_VAULT);
      expect(Object.keys(index.entries)).toHaveLength(1);
    });

    it('incremental build reuses unchanged entries', () => {
      writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nAlpha');

      const first = buildIndex(TEST_VAULT);
      const second = buildIndex(TEST_VAULT, first, false);

      expect(second.entries['concepts/a.md'].tokens).toEqual(first.entries['concepts/a.md'].tokens);
    });

    it('full rebuild reindexes everything', () => {
      writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nAlpha');

      const first = buildIndex(TEST_VAULT);
      const second = buildIndex(TEST_VAULT, first, true);

      expect(Object.keys(second.entries)).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('returns ranked results for matching query', () => {
      writeTestPage('concepts/transformer.md', '---\ntitle: "Transformer"\ntype: concept\ntags: ["nlp"]\n---\nTransformer architecture uses attention mechanism');
      writeTestPage('concepts/rnn.md', '---\ntitle: "RNN"\ntype: concept\ntags: ["nlp"]\n---\nRecurrent neural network for sequences');

      const index = buildIndex(TEST_VAULT);
      const results = search(index, 'transformer attention');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].path).toBe('concepts/transformer.md');
    });

    it('filters by type', () => {
      writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nAlpha beta');
      writeTestPage('claims/b.md', '---\ntitle: "B"\ntype: claim\ntags: []\n---\nAlpha gamma');

      const index = buildIndex(TEST_VAULT);
      const results = search(index, 'alpha', { type: ['claim'] });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('claim');
    });

    it('filters by tags', () => {
      writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: ["nlp"]\n---\nAlpha');
      writeTestPage('concepts/b.md', '---\ntitle: "B"\ntype: concept\ntags: ["cv"]\n---\nAlpha');

      const index = buildIndex(TEST_VAULT);
      const results = search(index, 'alpha', { tags: ['nlp'] });

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('concepts/a.md');
    });

    it('respects limit', () => {
      for (let i = 0; i < 5; i++) {
        writeTestPage(`concepts/item-${i}.md`, `---\ntitle: "Item ${i}"\ntype: concept\ntags: []\n---\nSearch term here`);
      }

      const index = buildIndex(TEST_VAULT);
      const results = search(index, 'search term', { limit: 3 });

      expect(results).toHaveLength(3);
    });

    it('returns empty for no matches', () => {
      writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: []\n---\nAlpha');

      const index = buildIndex(TEST_VAULT);
      const results = search(index, 'zzzznonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('loadIndex / saveIndex', () => {
    it('round-trips index data', () => {
      writeTestPage('concepts/a.md', '---\ntitle: "A"\ntype: concept\ntags: ["test"]\n---\nContent');

      const index = buildIndex(TEST_VAULT);
      saveIndex(TEST_VAULT, index);

      const loaded = loadIndex(TEST_VAULT);
      expect(loaded).toBeDefined();
      expect(loaded!.entries['concepts/a.md'].title).toBe('A');
    });

    it('returns undefined when no index file exists', () => {
      const loaded = loadIndex(TEST_VAULT);
      expect(loaded).toBeUndefined();
    });
  });
});
