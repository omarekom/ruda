import { parseWorld, serializeWorld, World } from '@ruda/core';
import { showcaseWorld } from '../game/showcase';
import type { StoredWorld, WorldStore } from './worldStore';

/** Stores a new, empty world. */
export function createEmptyWorld(
  store: Pick<WorldStore, 'create'>,
  name: string,
): Promise<StoredWorld> {
  return store.create(name, serializeWorld(new World(), name));
}

/** Stores a new world holding every built-in creation (temporary, for tuning block looks). */
export function createShowcaseWorld(
  store: Pick<WorldStore, 'create'>,
  name: string,
): Promise<StoredWorld> {
  return store.create(name, serializeWorld(showcaseWorld(), name));
}

/**
 * Renames a stored world. The name is also inside the `.ruda` data, so the data is rewritten.
 * Throws a RudaFileError if the stored data cannot be read.
 */
export async function renameWorld(
  store: Pick<WorldStore, 'load' | 'rename'>,
  id: string,
  name: string,
): Promise<void> {
  const stored = await store.load(id);
  if (!stored || stored.name === name) return;
  const { world } = parseWorld(stored.data);
  await store.rename(id, name, serializeWorld(world, name));
}
