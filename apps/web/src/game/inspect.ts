import { Axis, type Block, type BlockType, type Direction } from '@ruda/core';
import type { PowerState } from '../renderer/lighting';

/** What expert mode's inspector says about a block, as i18n keys and values. */
export interface Inspection {
  readonly type: BlockType;
  readonly facing: Direction | undefined;
  /** A key under `expert.inspector.state`, with values for its placeholders. */
  readonly state: { readonly key: string; readonly values?: Record<string, number> } | undefined;
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
      return { key: block.lit ? 'lit' : 'unlit' };
    case 'lamp':
      return { key: power.isLampLit(x, y) ? 'lit' : 'unlit' };
    case 'button':
      return { key: block.remaining > 0 ? 'pressed' : 'released' };
    case 'piston':
      return { key: block.extended ? 'extended' : 'retracted' };
    case 'delayer':
      return { key: 'delay', values: { ticks: block.line.length } };
    case 'redstone_block':
      return { key: 'powering' };
    case 'wire':
    case 'crossing': {
      const powered =
        power.isChannelPowered(x, y, Axis.Horizontal) ||
        power.isChannelPowered(x, y, Axis.Vertical);
      return { key: powered ? 'powered' : 'unpowered' };
    }
    default:
      return undefined;
  }
}
