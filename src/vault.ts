import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, normalize } from 'node:path';

const ENTITY_DIRS = [
  'sources',
  'concepts',
  'entities',
  'claims',
  'relations',
  'questions',
  'evidence',
  'failures',
  'topics',
] as const;

export type EntityType = (typeof ENTITY_DIRS)[number];

export const ENTITY_TYPES: readonly string[] = ENTITY_DIRS;

const SCHEMA_TEMPLATE = `---
type: schema
title: "Vault Schema"
created: ${new Date().toISOString().slice(0, 10)}
---

# Vault Schema

## Entity Types

| Type | Directory | Required Frontmatter |
|------|-----------|---------------------|
| source | sources/ | type, title, created |
| concept | concepts/ | type, title, created |
| entity | entities/ | type, title, created |
| claim | claims/ | type, title, confidence, created |
| relation | relations/ | type, title, created |
| question | questions/ | type, title, created |
| evidence | evidence/ | type, title, confidence, created |
| failure | failures/ | type, title, status, created |
| topic | topics/ | type, title, created |

## Edge Types

| Edge Type | Semantics |
|-----------|-----------|
| component_of | A is a building block of B |
| instance_of | A is a specific instance of B |
| supported_by | A's validity is backed by B |
| contradicts | A and B are in tension |
| supersedes | A replaces/improves upon B |
| derived_from | A was built on/inspired by B |
| addresses | A attempts to answer/solve B |
| raises | A generates/motivates B |
| failed_for | A was tried for B and didn't work |
| related_to | Weak association (fallback) |

## Naming Conventions

- Filenames: lowercase, hyphens, .md extension
- Wikilinks: \`[[directory/slug]]\` (e.g., \`[[concepts/self-attention]]\`)
`;

export function getVaultRoot(): string {
  const root = process.env.VAULT_ROOT;
  if (!root) {
    throw new Error('VAULT_ROOT environment variable is required');
  }
  return resolve(root);
}

export function ensureVaultDirs(vaultRoot: string): void {
  if (!existsSync(vaultRoot)) {
    mkdirSync(vaultRoot, { recursive: true });
  }

  for (const dir of ENTITY_DIRS) {
    const dirPath = join(vaultRoot, dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  const schemaPath = join(vaultRoot, '_schema.md');
  if (!existsSync(schemaPath)) {
    writeFileSync(schemaPath, SCHEMA_TEMPLATE, 'utf-8');
  }
}

export function resolveVaultPath(vaultRoot: string, relativePath: string): string {
  const resolved = resolve(vaultRoot, relativePath);
  const normalizedRoot = normalize(vaultRoot);
  const normalizedResolved = normalize(resolved);

  if (!normalizedResolved.startsWith(normalizedRoot)) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  return resolved;
}

export function isValidEntityType(type: string): type is EntityType {
  return ENTITY_DIRS.includes(type as EntityType);
}
