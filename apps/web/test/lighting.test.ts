import { Axis, createBlock, Direction, type Block } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { lightOf, withAlpha, type PowerState } from '../src/renderer/lighting';
import { WORKSHOP_LOOKS } from '../src/renderer/skins/workshop';

function power(lit: boolean, powered: boolean): PowerState {
  return {
    isLampLit: () => lit,
    isChannelPowered: (_x, _y, axis) => powered && axis === Axis.Vertical,
  };
}

const skin = WORKSHOP_LOOKS.classic;
const light = (block: Block, state: PowerState) => lightOf(3, 4, block, state, skin);

describe('lightOf', () => {
  it('lights a lit lamp in the lamp colour, with the widest glow', () => {
    const lamp = light(createBlock('lamp', Direction.North), power(true, false));
    expect(lamp).toMatchObject({ x: 3, y: 4, color: skin.light.lamp });
    const torch = light({ type: 'torch', facing: Direction.North, lit: true }, power(false, false));
    expect(lamp?.radius).toBeGreaterThan(torch?.radius ?? Infinity);
  });

  it('casts no light from unlit or unpowered blocks', () => {
    expect(light(createBlock('lamp', Direction.North), power(false, true))).toBeUndefined();
    expect(
      light({ type: 'torch', facing: Direction.East, lit: false }, power(true, true)),
    ).toBeUndefined();
    expect(light({ type: 'lever', on: false }, power(true, true))).toBeUndefined();
    expect(light(createBlock('wire', Direction.North), power(false, false))).toBeUndefined();
    expect(light(createBlock('stone', Direction.North), power(true, true))).toBeUndefined();
  });

  it('gives powered wires, sources and pressed buttons the power colour', () => {
    for (const block of [
      createBlock('wire', Direction.North),
      createBlock('crossing', Direction.North),
      createBlock('power_block', Direction.North),
      { type: 'button', remaining: 3 } as const,
      { type: 'lever', on: true } as const,
    ]) {
      expect(light(block, power(false, true))?.color).toBe(skin.light.power);
    }
  });
});

describe('withAlpha', () => {
  it('turns a hex colour into rgba', () => {
    expect(withAlpha('#ff8000', 0.5)).toBe('rgba(255, 128, 0, 0.5)');
  });
});
