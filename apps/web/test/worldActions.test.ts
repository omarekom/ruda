import { parseWorld, serializeWorld, World } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { createEmptyWorld, renameWorld } from '../src/storage/worldActions';
import type { StoredWorld } from '../src/storage/worldStore';

function memoryStore(initial: StoredWorld[] = []) {
  const worlds = new Map(initial.map((world) => [world.id, world]));
  return {
    worlds,
    async create(name: string, data: string): Promise<StoredWorld> {
      const world = { id: String(worlds.size + 1), name, data, updatedAt: 0 };
      worlds.set(world.id, world);
      return world;
    },
    async load(id: string): Promise<StoredWorld | undefined> {
      return worlds.get(id);
    },
    async rename(id: string, name: string, data: string): Promise<void> {
      worlds.set(id, { id, name, data, updatedAt: 1 });
    },
  };
}

describe('world actions', () => {
  it('creates an empty world with the name inside its data', async () => {
    const store = memoryStore();
    const created = await createEmptyWorld(store, 'Fresh');
    expect(parseWorld(created.data)).toMatchObject({ name: 'Fresh' });
    expect(parseWorld(created.data).world.blockCount).toBe(0);
  });

  it('renames a world in the list and inside its data', async () => {
    const world = new World();
    world.set(0, 0, { type: 'stone' });
    const store = memoryStore([
      { id: 'a', name: 'Old', data: serializeWorld(world, 'Old'), updatedAt: 0 },
    ]);
    await renameWorld(store, 'a', 'New');
    const renamed = store.worlds.get('a');
    expect(renamed?.name).toBe('New');
    expect(parseWorld(renamed?.data ?? '')).toMatchObject({ name: 'New' });
    expect(parseWorld(renamed?.data ?? '').world.get(0, 0)).toEqual({ type: 'stone' });
  });
});
