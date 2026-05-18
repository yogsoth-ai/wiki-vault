import { loadIndex, buildIndex, saveIndex } from '../index.js';

export async function vaultIndex(vaultRoot: string, full = false) {
  const existing = full ? undefined : loadIndex(vaultRoot);
  const index = buildIndex(vaultRoot, existing, full);

  const previousCount = existing ? Object.keys(existing.entries).length : 0;
  const currentCount = Object.keys(index.entries).length;
  const removed = Math.max(0, previousCount - currentCount);

  saveIndex(vaultRoot, index);

  return {
    indexed: currentCount,
    removed,
    duration_ms: Date.now() - index.lastBuild,
  };
}
