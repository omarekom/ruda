import { parseWorld, serializeWorld, World } from '@ruda/core';
import type { StoredWorld, WorldStore } from './worldStore';

/** A trailing " (2)" that numbers a name apart from others like it. */
const NUMBER_SUFFIX = /\s\(\d+\)$/;

/**
 * `name`, or if another world already has it, the name numbered apart from the others the way
 * Minecraft does it: "New world (1)", "New world (2)". A name that is already numbered is
 * numbered afresh, so a second "Showcase (1)" becomes "Showcase (2)", not "Showcase (1) (1)".
 */
export function uniqueWorldName(name: string, taken: readonly string[]): string {
  const names = new Set(taken);
  if (!names.has(name)) return name;
  const base = name.replace(NUMBER_SUFFIX, '');
  for (let number = 1; ; number++) {
    const numbered = `${base} (${number})`;
    if (!names.has(numbered)) return numbered;
  }
}

/** Stores a new world under a name no other world has; the name is also written inside the data. */
export async function createWorld(
  store: Pick<WorldStore, 'list' | 'create'>,
  name: string,
  world: World,
): Promise<StoredWorld> {
  const taken = (await store.list()).map((summary) => summary.name);
  const unique = uniqueWorldName(name, taken);
  return store.create(unique, serializeWorld(world, unique));
}

/** Stores a new, empty world. */
export function createEmptyWorld(
  store: Pick<WorldStore, 'list' | 'create'>,
  name: string,
): Promise<StoredWorld> {
  return createWorld(store, name, new World());
}

/**
 * Renames a stored world, numbering the name if another world already has it. The name is also
 * inside the `.ruda` data, so the data is rewritten. Throws a RudaFileError if the stored data
 * cannot be read.
 */
export async function renameWorld(
  store: Pick<WorldStore, 'list' | 'load' | 'rename'>,
  id: string,
  name: string,
): Promise<void> {
  const stored = await store.load(id);
  if (!stored || stored.name === name) return;
  const taken = (await store.list())
    .filter((summary) => summary.id !== id)
    .map((summary) => summary.name);
  const unique = uniqueWorldName(name, taken);
  if (unique === stored.name) return;
  const { world } = parseWorld(stored.data);
  await store.rename(id, unique, serializeWorld(world, unique));
}
