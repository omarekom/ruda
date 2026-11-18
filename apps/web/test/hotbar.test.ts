import { Direction } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { hotbarIcon } from '../src/game/hotbar';

describe('hotbar icons', () => {
  it('shows blocks switched on', () => {
    expect(hotbarIcon('lever', Direction.North)).toMatchObject({ on: true });
    expect(hotbarIcon('torch', Direction.East)).toMatchObject({
      lit: true,
      facing: Direction.East,
    });
    expect(hotbarIcon('button', Direction.North)).toMatchObject({ remaining: expect.any(Number) });
    expect(hotbarIcon('delayer', Direction.North)).toMatchObject({ line: [true] });
  });

  it('keeps pistons retracted', () => {
    expect(hotbarIcon('piston', Direction.North)).toMatchObject({ extended: false });
  });
});
