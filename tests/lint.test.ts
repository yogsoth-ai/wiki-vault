import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkBrokenWikilinks,
  checkOrphanPages,
  checkMissingFrontmatter,
  checkDuplicateEdges,
  checkStaleIndex,
  runLint,
} from '../src/lint.js';
import { appendEdge, loadEdges, Edge } from '../src/graph.js';
import { buildIndex, saveIndex } from '../src/index.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-lint-test-${Date.now()}`);

function makePage(path: string, content: string) {
  const full = join(TEST_VAULT, path);
  const dir = full.replace(/[/\\][^/\\]+$/, '');
  mkdirSync(dir, { recursive: true });
  writeFileSync(full, content);
}

describe('lint', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    mkdirSync(TEST_VAULT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  describe('checkBrokenWikilinks', () => {
    it('detects broken wikilinks', () => {
      makePage('concepts/a.md', '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\nSee [[concepts/nonexist]]');
      makePage('concepts/b.md', '---\ntype: concept\ntitle: B\ncreated: 2026-05-18\n---\n');

      const files = ['concepts/a.md', 'concepts/b.md'];
      const issues = checkBrokenWikilinks(TEST_VAULT, files);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('nonexist');
    });

    it('passes when all links resolve', () => {
      makePage('concepts/a.md', '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\nSee [[concepts/b]]');
      makePage('concepts/b.md', '---\ntype: concept\ntitle: B\ncreated: 2026-05-18\n---\n');

      const files = ['concepts/a.md', 'concepts/b.md'];
      const issues = checkBrokenWikilinks(TEST_VAULT, files);
      expect(issues).toHaveLength(0);
    });
  });

  describe('checkOrphanPages', () => {
    it('detects orphan pages with no edges or inbound links', () => {
      makePage('concepts/a.md', '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\n');
      makePage('concepts/b.md', '---\ntype: concept\ntitle: B\ncreated: 2026-05-18\n---\nSee [[concepts/a]]');
      makePage('concepts/c.md', '---\ntype: concept\ntitle: C\ncreated: 2026-05-18\n---\n');

      const files = ['concepts/a.md', 'concepts/b.md', 'concepts/c.md'];
      const issues = checkOrphanPages(TEST_VAULT, files, []);
      expect(issues.some((i) => i.path === 'concepts/c.md')).toBe(true);
      expect(issues.some((i) => i.path === 'concepts/a.md')).toBe(false);
    });
  });

  describe('checkMissingFrontmatter', () => {
    it('detects missing type field', () => {
      makePage('concepts/a.md', '---\ntitle: A\n---\n');
      const issues = checkMissingFrontmatter(TEST_VAULT, ['concepts/a.md']);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('type');
    });

    it('detects missing required fields for claim type', () => {
      makePage('claims/a.md', '---\ntype: claim\ntitle: A\ncreated: 2026-05-18\n---\n');
      const issues = checkMissingFrontmatter(TEST_VAULT, ['claims/a.md']);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain('confidence');
    });

    it('passes with all required fields', () => {
      makePage('concepts/a.md', '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\n');
      const issues = checkMissingFrontmatter(TEST_VAULT, ['concepts/a.md']);
      expect(issues).toHaveLength(0);
    });
  });

  describe('checkDuplicateEdges', () => {
    it('detects duplicate edges', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
      ];
      const { issues, deduped } = checkDuplicateEdges(edges);
      expect(issues).toHaveLength(1);
      expect(deduped).toHaveLength(1);
    });

    it('allows same pair with different edge type', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'derived_from', weight: 1.0, created: '2026-05-18' },
      ];
      const { issues, deduped } = checkDuplicateEdges(edges);
      expect(issues).toHaveLength(0);
      expect(deduped).toHaveLength(2);
    });
  });

  describe('checkStaleIndex', () => {
    it('detects stale index entries for deleted files', () => {
      makePage('concepts/a.md', '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\nContent');
      const index = buildIndex(TEST_VAULT);
      saveIndex(TEST_VAULT, index);

      rmSync(join(TEST_VAULT, 'concepts/a.md'));

      const { issues, staleKeys } = checkStaleIndex(TEST_VAULT, []);
      expect(staleKeys).toContain('concepts/a.md');
      expect(issues).toHaveLength(1);
    });
  });

  describe('runLint', () => {
    it('aggregates all issue types', () => {
      makePage('concepts/a.md', '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\nSee [[concepts/ghost]]');
      makePage('concepts/b.md', '---\ntitle: B\n---\n');

      const issues = runLint(TEST_VAULT);
      const messages = issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('Broken wikilink'))).toBe(true);
      expect(messages.some((m) => m.includes('Missing frontmatter'))).toBe(true);
    });

    it('fixes duplicate edges when fix=true', () => {
      makePage('concepts/a.md', '---\ntype: concept\ntitle: A\ncreated: 2026-05-18\n---\n');
      makePage('concepts/b.md', '---\ntype: concept\ntitle: B\ncreated: 2026-05-18\n---\n');

      appendEdge(TEST_VAULT, { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' });
      appendEdge(TEST_VAULT, { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' });

      const issues = runLint(TEST_VAULT, true);
      const dupIssues = issues.filter((i) => i.message.includes('Duplicate edge'));
      expect(dupIssues.every((i) => i.fixed)).toBe(true);

      const edges = loadEdges(TEST_VAULT);
      expect(edges).toHaveLength(1);
    });
  });
});
