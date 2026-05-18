import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureVaultDirs, resolveVaultPath, isValidEntityType, getVaultRoot, ENTITY_TYPES } from '../src/vault.js';

const TEST_VAULT = join(tmpdir(), `wiki-vault-test-${Date.now()}`);

describe('vault', () => {
  beforeEach(() => {
    if (existsSync(TEST_VAULT)) {
      rmSync(TEST_VAULT, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_VAULT)) {
      rmSync(TEST_VAULT, { recursive: true });
    }
  });

  describe('ensureVaultDirs', () => {
    it('creates all 9 entity directories', () => {
      ensureVaultDirs(TEST_VAULT);

      const expectedDirs = [
        'sources', 'concepts', 'entities', 'claims',
        'relations', 'questions', 'evidence', 'failures', 'topics',
      ];

      for (const dir of expectedDirs) {
        expect(existsSync(join(TEST_VAULT, dir))).toBe(true);
      }
    });

    it('creates _schema.md with correct content', () => {
      ensureVaultDirs(TEST_VAULT);

      const schemaPath = join(TEST_VAULT, '_schema.md');
      expect(existsSync(schemaPath)).toBe(true);

      const content = readFileSync(schemaPath, 'utf-8');
      expect(content).toContain('# Vault Schema');
      expect(content).toContain('## Entity Types');
      expect(content).toContain('## Edge Types');
      expect(content).toContain('component_of');
      expect(content).toContain('## Naming Conventions');
    });

    it('is idempotent — does not overwrite existing _schema.md', () => {
      ensureVaultDirs(TEST_VAULT);
      const schemaPath = join(TEST_VAULT, '_schema.md');
      const originalContent = readFileSync(schemaPath, 'utf-8');

      ensureVaultDirs(TEST_VAULT);
      const afterContent = readFileSync(schemaPath, 'utf-8');

      expect(afterContent).toBe(originalContent);
    });
  });

  describe('resolveVaultPath', () => {
    it('resolves relative paths within vault', () => {
      const resolved = resolveVaultPath(TEST_VAULT, 'concepts/self-attention.md');
      expect(resolved).toBe(join(TEST_VAULT, 'concepts', 'self-attention.md'));
    });

    it('throws on path traversal attempts', () => {
      expect(() => resolveVaultPath(TEST_VAULT, '../../../etc/passwd')).toThrow('Path traversal detected');
    });

    it('handles nested paths', () => {
      const resolved = resolveVaultPath(TEST_VAULT, 'sources/deep/nested/file.md');
      expect(resolved).toContain('sources');
      expect(resolved).toContain('file.md');
    });
  });

  describe('isValidEntityType', () => {
    it('returns true for valid entity types', () => {
      expect(isValidEntityType('sources')).toBe(true);
      expect(isValidEntityType('concepts')).toBe(true);
      expect(isValidEntityType('claims')).toBe(true);
      expect(isValidEntityType('failures')).toBe(true);
    });

    it('returns false for invalid types', () => {
      expect(isValidEntityType('invalid')).toBe(false);
      expect(isValidEntityType('')).toBe(false);
      expect(isValidEntityType('SOURCES')).toBe(false);
    });
  });

  describe('ENTITY_TYPES', () => {
    it('contains exactly 9 types', () => {
      expect(ENTITY_TYPES).toHaveLength(9);
    });
  });

  describe('getVaultRoot', () => {
    it('throws when VAULT_ROOT is not set', () => {
      const original = process.env.VAULT_ROOT;
      delete process.env.VAULT_ROOT;

      expect(() => getVaultRoot()).toThrow('VAULT_ROOT environment variable is required');

      if (original) process.env.VAULT_ROOT = original;
    });
  });
});
