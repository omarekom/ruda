import { describe, expect, it } from 'vitest';
import { Direction, wireAttaches } from '../src';
import { simulationFrom } from './helpers';

describe('wireAttaches', () => {
  it('attaches to conducting and power blocks but not stone', () => {
    const { blocks } = simulationFrom(`
.#.
S-o
.L.`);
    expect(wireAttaches(blocks, 1, 1, Direction.North)).toBe(true);
    expect(wireAttaches(blocks, 1, 1, Direction.East)).toBe(true);
    expect(wireAttaches(blocks, 1, 1, Direction.South)).toBe(true);
    expect(wireAttaches(blocks, 1, 1, Direction.West)).toBe(false);
  });

  it('attaches to the front and back of a torch only', () => {
    const { blocks } = simulationFrom(`
.-.
->-
.-.`);
    expect(wireAttaches(blocks, 0, 1, Direction.East)).toBe(true);
    expect(wireAttaches(blocks, 2, 1, Direction.West)).toBe(true);
    expect(wireAttaches(blocks, 1, 0, Direction.South)).toBe(false);
    expect(wireAttaches(blocks, 1, 2, Direction.North)).toBe(false);
  });
});
