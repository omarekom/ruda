import { parseWorld, serializeWorld, World } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { createEmptyWorld, renameWorld, uniqueWorldName } from '../src/storage/worldActions';
import type { StoredWorld } from '../src/storage/worldStore';

function memoryStore(initial: StoredWorld[] = []) {
  const worlds = new Map(initial.map((world) => [world.id, world]));
  return {
    worlds,
    async list(): Promise<StoredWorld[]> {
      return [...worlds.values()];
    },
    async create(name: string, data: string): Promise<StoredWorld> {
      const world = { id: String(`w${worlds.size + 1}`), name, data, updatedAt: 0 };
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

  it('numbers a new world whose name is taken', async () => {
    const store = memoryStore();
    const names: string[] = [];
    for (let i = 0; i < 3; i++) names.push((await createEmptyWorld(store, 'New world')).name);
    expect(names).toEqual(['New world', 'New world (1)', 'New world (2)']);
    expect(parseWorld([...store.worlds.values()][2]?.data ?? '')).toMatchObject({
      name: 'New world (2)',
    });
  });

  it('numbers a rename to a taken name, but lets a world keep its own name', async () => {
    const data = serializeWorld(new World(), 'x');
    const store = memoryStore([
      { id: 'a', name: 'Showcase', data, updatedAt: 0 },
      { id: 'b', name: 'Other', data, updatedAt: 0 },
    ]);
    await renameWorld(store, 'b', 'Showcase');
    expect(store.worlds.get('b')?.name).toBe('Showcase (1)');
    await renameWorld(store, 'b', 'Showcase (1)');
    expect(store.worlds.get('b')?.name).toBe('Showcase (1)');
  });
});

describe('uniqueWorldName', () => {
  it('keeps a free name', () => {
    expect(uniqueWorldName('Showcase', ['Other'])).toBe('Showcase');
  });

  it('takes the lowest free number', () => {
    expect(uniqueWorldName('Showcase', ['Showcase', 'Showcase (2)'])).toBe('Showcase (1)');
  });

  it('renumbers an already numbered name instead of adding a second number', () => {
    expect(uniqueWorldName('Showcase (1)', ['Showcase', 'Showcase (1)'])).toBe('Showcase (2)');
  });
});
