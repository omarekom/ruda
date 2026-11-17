import { Axis, createBlock, Direction } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { inspect } from '../src/game/inspect';
import type { PowerState } from '../src/renderer/lighting';

const dark: PowerState = { isLampLit: () => false, isChannelPowered: () => false };
const verticalOnly: PowerState = {
  isLampLit: () => true,
  isChannelPowered: (_x, _y, axis) => axis === Axis.Vertical,
};

describe('inspect', () => {
  it('reports the facing of rotatable blocks only', () => {
    expect(inspect(0, 0, createBlock('torch', Direction.West), dark).facing).toBe(Direction.West);
    expect(inspect(0, 0, createBlock('stone', Direction.West), dark).facing).toBeUndefined();
  });

  it('describes the state that matters for each block', () => {
    expect(inspect(0, 0, { type: 'lever', on: true }, dark).state).toEqual({ key: 'on' });
    expect(inspect(0, 0, createBlock('lamp', Direction.North), verticalOnly).state).toEqual({
      key: 'lit',
    });
    expect(inspect(0, 0, createBlock('crossing', Direction.North), verticalOnly).state).toEqual({
      key: 'powered',
    });
    expect(
      inspect(0, 0, { type: 'delayer', facing: Direction.North, line: [false, true, false] }, dark)
        .state,
    ).toEqual({ key: 'delay', values: { ticks: 3 } });
    expect(inspect(0, 0, createBlock('stone', Direction.North), dark).state).toBeUndefined();
  });
});
