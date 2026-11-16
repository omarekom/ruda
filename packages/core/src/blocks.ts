import { Axis, axisOf, Direction, opposite } from './coords';

export type Block =
  | { readonly type: 'redstone_block' }
  | { readonly type: 'lever'; readonly on: boolean }
  | { readonly type: 'wire' }
  | { readonly type: 'crossing' }
  | { readonly type: 'lamp' }
  | { readonly type: 'torch'; readonly facing: Direction; readonly lit: boolean }
  | { readonly type: 'stone' };

export type BlockType = Block['type'];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

interface BlockDefinition<T extends BlockType> {
  /** Whether the block has a facing that the player can rotate. */
  readonly rotatable: boolean;
  /** Creates a freshly placed block. */
  create(facing: Direction): BlockOf<T>;
  /** Whether the block sends power out of the given side to its neighbour. */
  emitsPower(block: BlockOf<T>, side: Direction): boolean;
  /** The wire channel on the given side, if the block conducts through it. */
  channel(side: Direction): Axis | undefined;
  /** Whether a neighbouring wire visually and logically attaches to the given side. */
  attachesWire(block: BlockOf<T>, side: Direction): boolean;
}

const never = (): false => false;
const always = (): true => true;
const noChannel = (): undefined => undefined;

const REGISTRY: { readonly [T in BlockType]: BlockDefinition<T> } = {
  redstone_block: {
    rotatable: false,
    create: () => ({ type: 'redstone_block' }),
    emitsPower: always,
    channel: noChannel,
    attachesWire: always,
  },
  lever: {
    rotatable: false,
    create: () => ({ type: 'lever', on: false }),
    emitsPower: (block) => block.on,
    channel: noChannel,
    attachesWire: always,
  },
  wire: {
    rotatable: false,
    create: () => ({ type: 'wire' }),
    emitsPower: never,
    // A wire is a single channel; the axis only identifies it.
    channel: () => Axis.Horizontal,
    attachesWire: always,
  },
  crossing: {
    rotatable: false,
    create: () => ({ type: 'crossing' }),
    emitsPower: never,
    channel: axisOf,
    attachesWire: always,
  },
  lamp: {
    rotatable: false,
    create: () => ({ type: 'lamp' }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: always,
  },
  torch: {
    rotatable: true,
    create: (facing) => ({ type: 'torch', facing, lit: false }),
    emitsPower: (block, side) => block.lit && side === block.facing,
    channel: noChannel,
    attachesWire: (block, side) => side === block.facing || side === opposite(block.facing),
  },
  stone: {
    rotatable: false,
    create: () => ({ type: 'stone' }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: never,
  },
};

export const BLOCK_TYPES = Object.keys(REGISTRY) as readonly BlockType[];

function definitionOf(type: BlockType): BlockDefinition<BlockType> {
  // The registry pairs each type with its own definition; TypeScript cannot correlate the union here.
  return REGISTRY[type] as BlockDefinition<BlockType>;
}

export function createBlock(type: BlockType, facing: Direction = Direction.North): Block {
  return definitionOf(type).create(facing);
}

export function isRotatable(type: BlockType): boolean {
  return definitionOf(type).rotatable;
}

export function emitsPower(block: Block, side: Direction): boolean {
  return definitionOf(block.type).emitsPower(block, side);
}

export function channelOf(block: Block, side: Direction): Axis | undefined {
  return definitionOf(block.type).channel(side);
}

export function attachesWire(block: Block, side: Direction): boolean {
  return definitionOf(block.type).attachesWire(block, side);
}
