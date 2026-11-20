import { Axis, type Block, type BlockType, type Direction } from '@ruda/core';
import type { PowerState } from '../renderer/lighting';

/** What debug mode says about a block, as i18n keys and values. */
export interface Inspection {
  readonly type: BlockType;
  readonly facing: Direction | undefined;
  /** A key under `debug.state`, with values for its placeholders. */
  readonly state:
    | { readonly key: string; readonly values?: Readonly<Record<string, number | string>> }
    | undefined;
}

export function inspect(x: number, y: number, block: Block, power: PowerState): Inspection {
  const facing = 'facing' in block ? block.facing : undefined;
  return { type: block.type, facing, state: stateOf(x, y, block, power) };
}

function stateOf(x: number, y: number, block: Block, power: PowerState): Inspection['state'] {
  switch (block.type) {
    case 'lever':
      return { key: block.on ? 'on' : 'off' };
    case 'torch':
      return { key: block.lit ? 'on' : 'off' };
    case 'lamp':
      return { key: power.isLampLit(x, y) ? 'lit' : 'unlit' };
    case 'button':
      return { key: block.remaining > 0 ? 'pressed' : 'released' };
    case 'piston':
      return { key: block.extended ? 'extended' : 'retracted' };
    case 'delayer':
      // The signals travelling through it, one digit per tick, the output first.
      return {
        key: 'delay',
        values: {
          ticks: block.line.length,
          line: block.line.map((on) => (on ? '1' : '0')).join(''),
        },
      };
    case 'power_block':
      return { key: 'powering' };
    case 'wire':
      // A wire is a single channel; its axis only identifies it.
      return { key: power.isChannelPowered(x, y, Axis.Horizontal) ? 'powered' : 'unpowered' };
    case 'crossing':
      return { key: crossingState(x, y, power) };
    default:
      return undefined;
  }
}

/** A crossing's two channels are independent, so each one's power is told apart. */
function crossingState(x: number, y: number, power: PowerState): string {
  const horizontal = power.isChannelPowered(x, y, Axis.Horizontal);
  const vertical = power.isChannelPowered(x, y, Axis.Vertical);
  if (horizontal && vertical) return 'crossingBoth';
  if (horizontal) return 'crossingHorizontal';
  if (vertical) return 'crossingVertical';
  return 'crossingNeither';
}
