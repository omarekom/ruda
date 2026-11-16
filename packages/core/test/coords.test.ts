import { describe, expect, it } from 'vitest';
import {
  cellKey,
  Direction,
  isInWorld,
  opposite,
  rotateClockwise,
  WORLD_MAX,
  WORLD_MIN,
} from '../src';
import { cellFromKey } from '../src/coords';

describe('coords', () => {
  it('round-trips cell keys at the world corners', () => {
    for (const [x, y] of [
      [WORLD_MIN, WORLD_MIN],
      [WORLD_MAX - 1, WORLD_MAX - 1],
      [0, 0],
      [-5, 7],
    ] as const) {
      expect(cellFromKey(cellKey(x, y))).toEqual([x, y]);
    }
  });

  it('gives distinct keys to neighbouring cells', () => {
    expect(cellKey(0, 1)).not.toBe(cellKey(1, 0));
  });

  it('bounds the world to [WORLD_MIN, WORLD_MAX)', () => {
    expect(isInWorld(WORLD_MIN, 0)).toBe(true);
    expect(isInWorld(WORLD_MAX, 0)).toBe(false);
    expect(isInWorld(0.5, 0)).toBe(false);
  });

  it('rotates and reverses directions', () => {
    expect(rotateClockwise(Direction.West)).toBe(Direction.North);
    expect(opposite(Direction.East)).toBe(Direction.West);
  });
});
