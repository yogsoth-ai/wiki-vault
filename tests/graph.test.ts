import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEdges, appendEdge, isDuplicate, queryGraph, computeGlobalStats, computeNodeStats, Edge } from '../src/graph.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-graph-test-${Date.now()}`);

function setup() {
  mkdirSync(join(TEST_VAULT, 'concepts'), { recursive: true });
  mkdirSync(join(TEST_VAULT, 'claims'), { recursive: true });
  writeFileSync(join(TEST_VAULT, 'concepts/a.md'), '---\ntitle: "A"\ntype: concept\ntags: []\n---\n');
  writeFileSync(join(TEST_VAULT, 'concepts/b.md'), '---\ntitle: "B"\ntype: concept\ntags: []\n---\n');
  writeFileSync(join(TEST_VAULT, 'concepts/c.md'), '---\ntitle: "C"\ntype: concept\ntags: []\n---\n');
  writeFileSync(join(TEST_VAULT, 'claims/d.md'), '---\ntitle: "D"\ntype: claim\ntags: []\n---\n');
}

describe('graph', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
    setup();
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) rmSync(TEST_VAULT, { recursive: true });
  });

  describe('loadEdges / appendEdge', () => {
    it('returns empty array when no edges file', () => {
      expect(loadEdges(TEST_VAULT)).toEqual([]);
    });

    it('appends and loads edges', () => {
      const edge: Edge = { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' };
      appendEdge(TEST_VAULT, edge);

      const edges = loadEdges(TEST_VAULT);
      expect(edges).toHaveLength(1);
      expect(edges[0].source).toBe('concepts/a.md');
      expect(edges[0].edge_type).toBe('component_of');
    });

    it('appends multiple edges', () => {
      appendEdge(TEST_VAULT, { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' });
      appendEdge(TEST_VAULT, { source: 'concepts/b.md', target: 'concepts/c.md', edge_type: 'derived_from', weight: 0.8, created: '2026-05-18' });

      expect(loadEdges(TEST_VAULT)).toHaveLength(2);
    });
  });

  describe('isDuplicate', () => {
    it('detects duplicate edges', () => {
      const edges: Edge[] = [{ source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' }];
      expect(isDuplicate(edges, 'concepts/a.md', 'concepts/b.md', 'component_of')).toBe(true);
    });

    it('allows same pair with different edge type', () => {
      const edges: Edge[] = [{ source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' }];
      expect(isDuplicate(edges, 'concepts/a.md', 'concepts/b.md', 'derived_from')).toBe(false);
    });
  });

  describe('queryGraph', () => {
    it('traverses outgoing edges at depth 1', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/b.md', target: 'concepts/c.md', edge_type: 'derived_from', weight: 1.0, created: '2026-05-18' },
      ];

      const result = queryGraph(edges, 'concepts/a.md', 'out', undefined, 1);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
    });

    it('traverses at depth 2', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/b.md', target: 'concepts/c.md', edge_type: 'derived_from', weight: 1.0, created: '2026-05-18' },
      ];

      const result = queryGraph(edges, 'concepts/a.md', 'out', undefined, 2);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('filters by edge type', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/a.md', target: 'concepts/c.md', edge_type: 'derived_from', weight: 1.0, created: '2026-05-18' },
      ];

      const result = queryGraph(edges, 'concepts/a.md', 'out', 'component_of', 1);
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].target).toBe('concepts/b.md');
    });

    it('traverses incoming edges', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/c.md', target: 'concepts/b.md', edge_type: 'derived_from', weight: 1.0, created: '2026-05-18' },
      ];

      const result = queryGraph(edges, 'concepts/b.md', 'in', undefined, 1);
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
    });

    it('traverses both directions', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/b.md', target: 'concepts/c.md', edge_type: 'derived_from', weight: 1.0, created: '2026-05-18' },
      ];

      const result = queryGraph(edges, 'concepts/b.md', 'both', undefined, 1);
      expect(result.nodes).toHaveLength(3);
    });
  });

  describe('computeGlobalStats', () => {
    it('computes stats with orphan detection', () => {
      appendEdge(TEST_VAULT, { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' });
      const edges = loadEdges(TEST_VAULT);

      const stats = computeGlobalStats(TEST_VAULT, edges);
      expect(stats.total_nodes).toBe(4);
      expect(stats.total_edges).toBe(1);
      expect(stats.orphan_nodes).toContain('concepts/c.md');
      expect(stats.orphan_nodes).toContain('claims/d.md');
      expect(stats.edge_type_distribution['component_of']).toBe(1);
    });
  });

  describe('computeNodeStats', () => {
    it('computes per-node stats', () => {
      const edges: Edge[] = [
        { source: 'concepts/a.md', target: 'concepts/b.md', edge_type: 'component_of', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/c.md', target: 'concepts/b.md', edge_type: 'derived_from', weight: 1.0, created: '2026-05-18' },
        { source: 'concepts/b.md', target: 'claims/d.md', edge_type: 'supported_by', weight: 1.0, created: '2026-05-18' },
      ];

      const stats = computeNodeStats(edges, 'concepts/b.md');
      expect(stats.in_degree).toBe(2);
      expect(stats.out_degree).toBe(1);
      expect(stats.edge_types).toContain('component_of');
      expect(stats.edge_types).toContain('derived_from');
      expect(stats.edge_types).toContain('supported_by');
      expect(stats.neighbors).toHaveLength(3);
    });
  });
});
