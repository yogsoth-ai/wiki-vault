import { loadIndex, buildIndex, searchWithSnippets, saveIndex } from '../index.js';
import { resolveVaultPath } from '../vault.js';

export async function vaultSearch(
  vaultRoot: string,
  query: string,
  type?: string[],
  tags?: string[],
  limit?: number,
) {
  let index = loadIndex(vaultRoot);
  if (!index) {
    index = buildIndex(vaultRoot);
    saveIndex(vaultRoot, index);
  }

  const results = searchWithSnippets(vaultRoot, index, query, { type, tags, limit });
  return { results };
}
