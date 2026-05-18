import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEdges, writeEdges, Edge } from './graph.js';
import { loadIndex, saveIndex, IndexData } from './index.js';
import { ENTITY_TYPES } from './vault.js';

export interface LintIssue {
  path: string;
  severity: 'error' | 'warning';
  message: string;
  fixed?: boolean;
}

const REQUIRED_FRONTMATTER: Record<string, string[]> = {
  source: ['type', 'title', 'created'],
  concept: ['type', 'title', 'created'],
  entity: ['type', 'title', 'created'],
  claim: ['type', 'title', 'confidence', 'created'],
  relation: ['type', 'title', 'created'],
  question: ['type', 'title', 'created'],
  evidence: ['type', 'title', 'confidence', 'created'],
  failure: ['type', 'title', 'status', 'created'],
  topic: ['type', 'title', 'created'],
};

function getAllMdFiles(vaultRoot: string): string[] {
  const results: string[] = [];
  for (const dir of ENTITY_TYPES) {
    const dirPath = join(vaultRoot, dir);
    if (!existsSync(dirPath)) continue;
    const files = readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.md')) {
        results.push(`${dir}/${file}`);
      }
    }
  }
  return results;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) fields[kv[1]] = kv[2];
  }
  return fields;
}

function extractWikilinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g);
  if (!matches) return [];
  return matches.map((m) => {
    let link = m.slice(2, -2);
    if (!link.endsWith('.md')) link += '.md';
    return link;
  });
}

export function checkBrokenWikilinks(vaultRoot: string, files: string[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const fileSet = new Set(files);

  for (const file of files) {
    const content = readFileSync(join(vaultRoot, file), 'utf-8');
    const links = extractWikilinks(content);

    for (const link of links) {
      if (!fileSet.has(link) && !existsSync(join(vaultRoot, link))) {
        issues.push({
          path: file,
          severity: 'error',
          message: `Broken wikilink: [[${link.replace('.md', '')}]]`,
        });
      }
    }
  }

  return issues;
}

export function checkOrphanPages(vaultRoot: string, files: string[], edges: Edge[]): LintIssue[] {
  const issues: LintIssue[] = [];
  const referenced = new Set<string>();

  for (const edge of edges) {
    referenced.add(edge.source);
    referenced.add(edge.target);
  }

  for (const file of files) {
    const content = readFileSync(join(vaultRoot, file), 'utf-8');
    const links = extractWikilinks(content);
    for (const link of links) {
      referenced.add(link);
    }
  }

  for (const file of files) {
    if (!referenced.has(file)) {
      issues.push({
        path: file,
        severity: 'warning',
        message: 'Orphan page: no inbound edges or wikilinks',
      });
    }
  }

  return issues;
}

export function checkMissingFrontmatter(vaultRoot: string, files: string[]): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const file of files) {
    const content = readFileSync(join(vaultRoot, file), 'utf-8');
    const fm = parseFrontmatter(content);

    if (!fm.type) {
      issues.push({ path: file, severity: 'error', message: 'Missing frontmatter: type' });
      continue;
    }

    const required = REQUIRED_FRONTMATTER[fm.type];
    if (!required) continue;

    for (const field of required) {
      if (!fm[field]) {
        issues.push({ path: file, severity: 'error', message: `Missing frontmatter: ${field}` });
      }
    }
  }

  return issues;
}

export function checkDuplicateEdges(edges: Edge[]): { issues: LintIssue[]; deduped: Edge[] } {
  const seen = new Set<string>();
  const deduped: Edge[] = [];
  const issues: LintIssue[] = [];

  for (const edge of edges) {
    const key = `${edge.source}|${edge.target}|${edge.edge_type}`;
    if (seen.has(key)) {
      issues.push({
        path: '_edges.jsonl',
        severity: 'warning',
        message: `Duplicate edge: ${edge.source} -[${edge.edge_type}]-> ${edge.target}`,
      });
    } else {
      seen.add(key);
      deduped.push(edge);
    }
  }

  return { issues, deduped };
}

export function checkStaleIndex(vaultRoot: string, files: string[]): { issues: LintIssue[]; staleKeys: string[] } {
  const index = loadIndex(vaultRoot);
  if (!index) return { issues: [], staleKeys: [] };

  const fileSet = new Set(files);
  const staleKeys: string[] = [];
  const issues: LintIssue[] = [];

  for (const key of Object.keys(index.entries)) {
    if (!fileSet.has(key)) {
      staleKeys.push(key);
      issues.push({
        path: '_index.json',
        severity: 'warning',
        message: `Stale index entry: ${key} (file no longer exists)`,
      });
    }
  }

  return { issues, staleKeys };
}

export function runLint(vaultRoot: string, fix = false): LintIssue[] {
  const files = getAllMdFiles(vaultRoot);
  const edges = loadEdges(vaultRoot);
  const allIssues: LintIssue[] = [];

  allIssues.push(...checkBrokenWikilinks(vaultRoot, files));
  allIssues.push(...checkOrphanPages(vaultRoot, files, edges));
  allIssues.push(...checkMissingFrontmatter(vaultRoot, files));

  const { issues: dupIssues, deduped } = checkDuplicateEdges(edges);
  allIssues.push(...dupIssues);

  const { issues: staleIssues, staleKeys } = checkStaleIndex(vaultRoot, files);
  allIssues.push(...staleIssues);

  if (fix) {
    if (deduped.length < edges.length) {
      writeEdges(vaultRoot, deduped);
      for (const issue of dupIssues) issue.fixed = true;
    }

    if (staleKeys.length > 0) {
      const index = loadIndex(vaultRoot);
      if (index) {
        for (const key of staleKeys) {
          delete index.entries[key];
        }
        saveIndex(vaultRoot, index);
        for (const issue of staleIssues) issue.fixed = true;
      }
    }
  }

  return allIssues;
}
