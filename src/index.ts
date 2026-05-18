import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface IndexEntry {
  path: string;
  title: string;
  type: string;
  tags: string[];
  tokens: string[];
  mtime: number;
}

export interface IndexData {
  entries: Record<string, IndexEntry>;
  idf: Record<string, number>;
  lastBuild: number;
}

export interface SearchResult {
  path: string;
  title: string;
  type: string;
  score: number;
  snippet: string;
}

export function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const expanded: string[] = [];
  for (const token of raw) {
    expanded.push(token);
    if (token.includes('-')) {
      for (const part of token.split('-')) {
        if (part.length > 1) expanded.push(part);
      }
    }
  }
  return expanded;
}

function extractFrontmatter(content: string): { title: string; type: string; tags: string[] } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return { title: '', type: '', tags: [] };

  const fm = fmMatch[1];
  const titleMatch = fm.match(/^title:\s*"?([^"\n]+)"?/m);
  const typeMatch = fm.match(/^type:\s*(\S+)/m);
  const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);

  const tags = tagsMatch
    ? tagsMatch[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : [];

  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    type: typeMatch ? typeMatch[1].trim() : '',
    tags,
  };
}

function getSnippet(content: string, queryTokens: string[], maxLen = 150): string {
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/^#+\s.*$/gm, '');
  const lines = body.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (queryTokens.some((t) => lower.includes(t))) {
      return line.slice(0, maxLen);
    }
  }

  return lines[0]?.slice(0, maxLen) || '';
}

function walkMdFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string) {
    if (!existsSync(current)) return;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

export function buildIndex(vaultRoot: string, existingIndex?: IndexData, full = false): IndexData {
  const files = walkMdFiles(vaultRoot);
  const entries: Record<string, IndexEntry> = {};
  const now = Date.now();

  for (const filePath of files) {
    const relPath = relative(vaultRoot, filePath).replace(/\\/g, '/');
    const stat = statSync(filePath);
    const mtime = stat.mtimeMs;

    if (!full && existingIndex?.entries[relPath] && existingIndex.entries[relPath].mtime >= mtime) {
      entries[relPath] = existingIndex.entries[relPath];
      continue;
    }

    const content = readFileSync(filePath, 'utf-8');
    const { title, type, tags } = extractFrontmatter(content);
    const tokens = tokenize(content);

    entries[relPath] = { path: relPath, title, type, tags, tokens, mtime };
  }

  const totalDocs = Object.keys(entries).length;
  const df: Record<string, number> = {};

  for (const entry of Object.values(entries)) {
    const uniqueTokens = new Set(entry.tokens);
    for (const token of uniqueTokens) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  const idf: Record<string, number> = {};
  for (const [token, count] of Object.entries(df)) {
    idf[token] = Math.log((totalDocs - count + 0.5) / (count + 0.5) + 1);
  }

  return { entries, idf, lastBuild: now };
}

export function search(
  index: IndexData,
  query: string,
  options?: { type?: string[]; tags?: string[]; limit?: number },
): SearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const limit = options?.limit ?? 20;
  const results: SearchResult[] = [];

  for (const entry of Object.values(index.entries)) {
    if (options?.type?.length && !options.type.includes(entry.type)) continue;
    if (options?.tags?.length && !options.tags.some((t) => entry.tags.includes(t))) continue;

    const score = bm25Score(entry.tokens, queryTokens, index.idf);
    if (score > 0) {
      results.push({
        path: entry.path,
        title: entry.title || entry.path,
        type: entry.type,
        score,
        snippet: '',
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function bm25Score(docTokens: string[], queryTokens: string[], idf: Record<string, number>): number {
  const k1 = 1.2;
  const b = 0.75;
  const avgDl = 500;
  const dl = docTokens.length;

  const tf: Record<string, number> = {};
  for (const token of docTokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  let score = 0;
  for (const qt of queryTokens) {
    const termFreq = tf[qt] || 0;
    if (termFreq === 0) continue;

    const idfScore = idf[qt] || 0;
    const numerator = termFreq * (k1 + 1);
    const denominator = termFreq + k1 * (1 - b + b * (dl / avgDl));
    score += idfScore * (numerator / denominator);
  }

  return score;
}

export function loadIndex(vaultRoot: string): IndexData | undefined {
  const indexPath = join(vaultRoot, '_index.json');
  if (!existsSync(indexPath)) return undefined;

  try {
    const raw = readFileSync(indexPath, 'utf-8');
    return JSON.parse(raw) as IndexData;
  } catch {
    return undefined;
  }
}

export function saveIndex(vaultRoot: string, index: IndexData): void {
  const indexPath = join(vaultRoot, '_index.json');
  writeFileSync(indexPath, JSON.stringify(index), 'utf-8');
}

export function searchWithSnippets(
  vaultRoot: string,
  index: IndexData,
  query: string,
  options?: { type?: string[]; tags?: string[]; limit?: number },
): SearchResult[] {
  const queryTokens = tokenize(query);
  const results = search(index, query, options);

  for (const result of results) {
    try {
      const content = readFileSync(join(vaultRoot, result.path), 'utf-8');
      result.snippet = getSnippet(content, queryTokens);
    } catch {
      result.snippet = '';
    }
  }

  return results;
}
