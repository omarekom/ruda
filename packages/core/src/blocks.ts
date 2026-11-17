import {
  Axis,
  axisOf,
  Direction,
  directionFromName,
  directionName,
  DIRECTIONS,
  opposite,
} from './coords';

export type Block =
  | { readonly type: 'power_block' }
  | { readonly type: 'lever'; readonly on: boolean }
  | { readonly type: 'wire' }
  | { readonly type: 'crossing' }
  | { readonly type: 'lamp' }
  | { readonly type: 'torch'; readonly facing: Direction; readonly lit: boolean }
  /**
   * A pure delay line: `line[0]` is the current output, the last item the most recently
   * sampled input. Its length is the delay in ticks.
   */
  | { readonly type: 'delayer'; readonly facing: Direction; readonly line: readonly boolean[] }
  /** Powered while `remaining` ticks are left. */
  | { readonly type: 'button'; readonly remaining: number }
  /** Pushes the blocks in front of it while powered. When extended, its head is in front. */
  | { readonly type: 'piston'; readonly facing: Direction; readonly extended: boolean }
  /** The extended part of a piston; the piston is behind it, facing the same way. */
  | { readonly type: 'piston_head'; readonly facing: Direction }
  | { readonly type: 'stone' };

export const MIN_DELAY = 1;
export const MAX_DELAY = 4;
export const BUTTON_TICKS = 10;

/** Reports whether power enters the block through the given side. */
export type PowerInput = (side: Direction) => boolean;

export type BlockType = Block['type'];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

interface BlockDefinition<T extends BlockType> {
  /** Whether the block has a facing that the player can rotate. */
  readonly rotatable: boolean;
  /** Solid blocks can be pushed by pistons; flat components block the push instead. */
  readonly pushable: boolean;
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
  /** Sides the block reads power from to compute its next tick. */
  inputs(block: BlockOf<T>): readonly Direction[];
  /** Blocks with a delay: the state one tick later, given the power entering each side. */
  tick?(block: BlockOf<T>, input: PowerInput): BlockOf<T>;
  /** The state after the player interacts with it; undefined if nothing happens. */
  interact?(block: BlockOf<T>): BlockOf<T> | undefined;
}

const never = (): false => false;
const always = (): true => true;
const noChannel = (): undefined => undefined;
const noState = (): readonly string[] => [];
const noInputs = (): readonly Direction[] => [];
const back = (block: { readonly facing: Direction }): readonly Direction[] => [
  opposite(block.facing),
];
const allButFront = (block: { readonly facing: Direction }): readonly Direction[] =>
  DIRECTIONS.filter((side) => side !== block.facing);
const frontAndBack = (block: { readonly facing: Direction }, side: Direction): boolean =>
  side === block.facing || side === opposite(block.facing);

function parseDirection(name: string | undefined): Direction | undefined {
  return name === undefined ? undefined : directionFromName(name);
}

/** Parses a non-negative integer written in canonical form (no sign, no leading zeros). */
function parseCount(value: string | undefined): number | undefined {
  return value !== undefined && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : undefined;
}

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
  power_block: {
    rotatable: false,
    pushable: true,
    create: () => ({ type: 'power_block' }),
    emitsPower: always,
    channel: noChannel,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'power_block' }),
    inputs: noInputs,
  },
  lever: {
    rotatable: false,
    pushable: false,
    create: () => ({ type: 'lever', on: false }),
    emitsPower: (block) => block.on,
    channel: noChannel,
    attachesWire: always,
    stateOf: (block) => [block.on ? 'on' : 'off'],
    fromState: ([power, ...rest]) => {
      const on = onOff(power, 'on', 'off');
      return on === undefined || rest.length > 0 ? undefined : { type: 'lever', on };
    },
    inputs: noInputs,
    interact: (block) => ({ type: 'lever', on: !block.on }),
  },
  wire: {
    rotatable: false,
    pushable: false,
    create: () => ({ type: 'wire' }),
    emitsPower: never,
    // A wire is a single channel; the axis only identifies it.
    channel: () => Axis.Horizontal,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'wire' }),
    inputs: noInputs,
  },
  crossing: {
    rotatable: false,
    pushable: false,
    create: () => ({ type: 'crossing' }),
    emitsPower: never,
    channel: axisOf,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'crossing' }),
    inputs: noInputs,
  },
  lamp: {
    rotatable: false,
    pushable: true,
    create: () => ({ type: 'lamp' }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: always,
    stateOf: noState,
    fromState: stateless({ type: 'lamp' }),
    inputs: noInputs,
  },
  torch: {
    rotatable: true,
    pushable: false,
    create: (facing) => ({ type: 'torch', facing, lit: false }),
    emitsPower: (block, side) => block.lit && side === block.facing,
    channel: noChannel,
    attachesWire: frontAndBack,
    stateOf: (block) => [directionName(block.facing), block.lit ? 'lit' : 'unlit'],
    fromState: ([name, light, ...rest]) => {
      const facing = parseDirection(name);
      const lit = onOff(light, 'lit', 'unlit');
      if (facing === undefined || lit === undefined || rest.length > 0) return undefined;
      return { type: 'torch', facing, lit };
    },
    inputs: back,
    tick: (block, input) => ({ ...block, lit: !input(opposite(block.facing)) }),
  },
  delayer: {
    rotatable: true,
    pushable: false,
    create: (facing) => ({ type: 'delayer', facing, line: [false] }),
    emitsPower: (block, side) => (block.line[0] ?? false) && side === block.facing,
    channel: noChannel,
    attachesWire: frontAndBack,
    stateOf: (block) => [
      directionName(block.facing),
      String(block.line.length),
      block.line.map((on) => (on ? '1' : '0')).join(''),
    ],
    fromState: ([name, delayText, bits, ...rest]) => {
      const facing = parseDirection(name);
      const delay = parseCount(delayText);
      if (facing === undefined || delay === undefined || bits === undefined || rest.length > 0) {
        return undefined;
      }
      if (delay < MIN_DELAY || delay > MAX_DELAY || !/^[01]+$/.test(bits)) return undefined;
      if (bits.length !== delay) return undefined;
      return { type: 'delayer', facing, line: [...bits].map((bit) => bit === '1') };
    },
    inputs: back,
    tick: (block, input) => ({
      ...block,
      line: [...block.line.slice(1), input(opposite(block.facing))],
    }),
    // Cycles the delay; the whole line takes the current output so the change causes no pulse.
    interact: (block) => {
      const delay = (block.line.length % MAX_DELAY) + MIN_DELAY;
      return { ...block, line: new Array<boolean>(delay).fill(block.line[0] ?? false) };
    },
  },
  button: {
    rotatable: false,
    pushable: false,
    create: () => ({ type: 'button', remaining: 0 }),
    emitsPower: (block) => block.remaining > 0,
    channel: noChannel,
    attachesWire: always,
    stateOf: (block) => [String(block.remaining)],
    fromState: ([text, ...rest]) => {
      const remaining = parseCount(text);
      if (remaining === undefined || remaining > BUTTON_TICKS || rest.length > 0) return undefined;
      return { type: 'button', remaining };
    },
    inputs: noInputs,
    tick: (block) => ({ ...block, remaining: Math.max(0, block.remaining - 1) }),
    interact: (block) => (block.remaining > 0 ? undefined : { ...block, remaining: BUTTON_TICKS }),
  },
  piston: {
    rotatable: true,
    pushable: true,
    create: (facing) => ({ type: 'piston', facing, extended: false }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: (block, side) => side !== block.facing,
    stateOf: (block) => [directionName(block.facing), block.extended ? 'extended' : 'retracted'],
    fromState: ([name, position, ...rest]) => {
      const facing = parseDirection(name);
      const extended = onOff(position, 'extended', 'retracted');
      if (facing === undefined || extended === undefined || rest.length > 0) return undefined;
      return { type: 'piston', facing, extended };
    },
    inputs: allButFront,
    // The wanted position; the simulation performs the push or pull, which may be blocked.
    tick: (block, input) => ({ ...block, extended: allButFront(block).some(input) }),
  },
  piston_head: {
    rotatable: false,
    pushable: false,
    create: (facing) => ({ type: 'piston_head', facing }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: never,
    stateOf: (block) => [directionName(block.facing)],
    fromState: ([name, ...rest]) => {
      const facing = parseDirection(name);
      return facing === undefined || rest.length > 0 ? undefined : { type: 'piston_head', facing };
    },
    inputs: noInputs,
  },
  stone: {
    rotatable: false,
    pushable: true,
    create: () => ({ type: 'stone' }),
    emitsPower: never,
    channel: noChannel,
    attachesWire: never,
    stateOf: noState,
    fromState: stateless({ type: 'stone' }),
    inputs: noInputs,
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

export function isPushable(block: Block): boolean {
  return definitionOf(block.type).pushable;
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

export function inputsOf(block: Block): readonly Direction[] {
  return definitionOf(block.type).inputs(block);
}

/** The block one tick later, or undefined for blocks without delay. */
export function tickBlock(block: Block, input: PowerInput): Block | undefined {
  return definitionOf(block.type).tick?.(block, input);
}

export function hasDelay(block: Block): boolean {
  return definitionOf(block.type).tick !== undefined;
}

export function isInteractive(block: Block): boolean {
  return definitionOf(block.type).interact !== undefined;
}

export function interactWith(block: Block): Block | undefined {
  return definitionOf(block.type).interact?.(block);
}

export function sameBlock(a: Block, b: Block): boolean {
  if (a.type !== b.type) return false;
  const stateA = stateOf(a);
  const stateB = stateOf(b);
  return stateA.length === stateB.length && stateA.every((part, i) => part === stateB[i]);
}
