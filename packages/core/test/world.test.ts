import { describe, expect, it } from 'vitest';
import { World, type Block } from '../src';

const stone: Block = { type: 'stone' };

describe('World', () => {
  it('stores blocks across chunk boundaries, including negative coordinates', () => {
    const world = new World();
    world.set(-1, -1, stone);
    world.set(31, 32, stone);
    expect(world.get(-1, -1)).toEqual(stone);
    expect(world.get(31, 32)).toEqual(stone);
    expect(world.get(0, 0)).toBeUndefined();
    expect(world.blockCount).toBe(2);
  });

  it('forgets cleared blocks', () => {
    const world = new World();
    world.set(3, 3, stone);
    world.set(3, 3, undefined);
    expect(world.blockCount).toBe(0);
    const seen: number[] = [];
    world.forEach((x) => seen.push(x));
    expect(seen).toEqual([]);
  });

  it('visits only blocks inside the rectangle', () => {
    const world = new World();
    world.set(0, 0, stone);
    world.set(5, 5, stone);
    world.set(-40, 2, stone);
    const seen: [number, number][] = [];
    world.forEachInRect(-1, -1, 5, 5, (x, y) => seen.push([x, y]));
    expect(seen.sort()).toEqual([
      [0, 0],
      [5, 5],
    ]);
  });

  it('rejects cells outside the world', () => {
    expect(() => new World().set(32000, 0, stone)).toThrow(RangeError);
  });
});
