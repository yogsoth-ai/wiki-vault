import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ENTITY_TYPES, EDGE_TYPES } from '../vault.js';

export interface VaultInfo {
  root: string;
  directories: {
    sources: string;
    wiki: string;
    schema: string;
  };
  entity_types: string[];
  edge_types: string[];
  stats: {
    pages: number;
    edges: number;
    index_entries: number;
  };
}

function countPages(vaultRoot: string): number {
  let count = 0;

  function walk(dir: string) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        count++;
      }
    }
  }

  walk(vaultRoot);
  return count;
}

function countEdges(vaultRoot: string): number {
  const edgesPath = join(vaultRoot, '_edges.jsonl');
  if (!existsSync(edgesPath)) return 0;
  const content = readFileSync(edgesPath, 'utf-8').trim();
  if (!content) return 0;
  return content.split('\n').filter(line => line.trim()).length;
}

function countIndexEntries(vaultRoot: string): number {
  const indexPath = join(vaultRoot, '_index.json');
  if (!existsSync(indexPath)) return 0;
  try {
    const raw = readFileSync(indexPath, 'utf-8');
    const data = JSON.parse(raw);
    return Object.keys(data.entries || {}).length;
  } catch {
    return 0;
  }
}

export async function vaultInfo(vaultRoot: string): Promise<VaultInfo> {
  return {
    root: vaultRoot,
    directories: {
      sources: 'sources/',
      wiki: 'wiki/',
      schema: 'schema/',
    },
    entity_types: [...ENTITY_TYPES],
    edge_types: [...EDGE_TYPES],
    stats: {
      pages: countPages(vaultRoot),
      edges: countEdges(vaultRoot),
      index_entries: countIndexEntries(vaultRoot),
    },
  };
}
