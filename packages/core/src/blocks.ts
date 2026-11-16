import { Axis, axisOf, Direction, directionFromName, directionName, opposite } from './coords';

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
  /** State segments written after the type in a file key, e.g. `['east', 'lit']`. */
  stateOf(block: BlockOf<T>): readonly string[];
  /** Rebuilds a block from its state segments; undefined if they are invalid. */
  fromState(state: readonly string[]): BlockOf<T> | undefined;
}

const never = (): false => false;
const always = (): true => true;
const noChannel = (): undefined => undefined;
const noState = (): readonly string[] => [];

/** `fromState` for blocks without state: only an empty state is valid. */
function stateless<B extends Block>(block: B): (state: readonly string[]) => B | undefined {
  return (state) => (state.length === 0 ? block : undefined);
}

function onOff(value: string | undefined, on: string, off: string): boolean | undefined {
  if (value === on) return true;
  if (value === off) return false;
  return undefined;
}

const REGISTRY: { readonly [T in BlockType]: BlockDefinition<T> } = {
  redstone_block: {
    rotatable: false,
    create: () => ({ type: 'redstone_block' }),
    emitsPower: always,
    channel: noChannel,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'redstone_block' }),
  },
  lever: {
    rotatable: false,
    create: () => ({ type: 'lever', on: false }),
    emitsPower: (block) => block.on,
    channel: noChannel,
    attachesWire: always,
    stateOf: (block) => [block.on ? 'on' : 'off'],
    fromState: ([power, ...rest]) => {
      const on = onOff(power, 'on', 'off');
      return on === undefined || rest.length > 0 ? undefined : { type: 'lever', on };
    },
  },
  wire: {
    rotatable: false,
    create: () => ({ type: 'wire' }),
    emitsPower: never,
    // A wire is a single channel; the axis only identifies it.
    channel: () => Axis.Horizontal,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'wire' }),
  },
  crossing: {
    rotatable: false,
    create: () => ({ type: 'crossing' }),
    emitsPower: never,
    channel: axisOf,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'crossing' }),
  },
  lamp: {
    rotatable: false,
    create: () => ({ type: 'lamp' }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'lamp' }),
  },
  torch: {
    rotatable: true,
    create: (facing) => ({ type: 'torch', facing, lit: false }),
    emitsPower: (block, side) => block.lit && side === block.facing,
    channel: noChannel,
    attachesWire: (block, side) => side === block.facing || side === opposite(block.facing),
    stateOf: (block) => [directionName(block.facing), block.lit ? 'lit' : 'unlit'],
    fromState: ([name, light, ...rest]) => {
      const facing = name === undefined ? undefined : directionFromName(name);
      const lit = onOff(light, 'lit', 'unlit');
      if (facing === undefined || lit === undefined || rest.length > 0) return undefined;
      return { type: 'torch', facing, lit };
    },
  },
  stone: {
    rotatable: false,
    create: () => ({ type: 'stone' }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: never,
    stateOf: noState,
    fromState: stateless({ type: 'stone' }),
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

export function stateOf(block: Block): readonly string[] {
  return definitionOf(block.type).stateOf(block);
}

export function isBlockType(type: string): type is BlockType {
  return Object.hasOwn(REGISTRY, type);
}

export function blockFromState(type: BlockType, state: readonly string[]): Block | undefined {
  return definitionOf(type).fromState(state);
}
