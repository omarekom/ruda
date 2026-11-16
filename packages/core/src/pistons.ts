import type { Block, BlockOf } from './blocks';
import { cellKey, isInWorld, offset, opposite } from './coords';
import type { ReadonlyWorld } from './world';

/** The most blocks one piston can push. */
export const MAX_PUSH = 12;

type Piston = BlockOf<'piston'>;

/** A block that moved during the last tick, for animation. */
export interface BlockMove {
  readonly block: Block;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

/** A piston extending or retracting this tick, with every cell it affects. */
export interface PistonPlan {
  readonly x: number;
  readonly y: number;
  /** The piston after the move. */
  readonly piston: Piston;
  /** Cells the move touches; two plans claiming the same cell both fail. */
  readonly claims: readonly number[];
  /** Moved blocks, the far end of the pushed chain first. */
  readonly moves: readonly BlockMove[];
}

/** Piston heads and extended pistons stay put; everything else can be pushed. */
export function isMovable(block: Block): boolean {
  return block.type !== 'piston_head' && !(block.type === 'piston' && block.extended);
}

/** Players place only whole, retracted pistons; heads appear by extending. */
export function isPlaceable(block: Block): boolean {
  return isMovable(block);
}

/** Plans moving the piston at (x, y) to `target`; undefined if it is blocked. */
export function planPiston(
  world: ReadonlyWorld,
  x: number,
  y: number,
  target: Piston,
): PistonPlan | undefined {
  return target.extended ? planExtend(world, x, y, target) : planRetract(x, y, target);
}

function planExtend(
  world: ReadonlyWorld,
  x: number,
  y: number,
  target: Piston,
): PistonPlan | undefined {
  const [dx, dy] = offset(target.facing);
  const chain: [number, number, Block][] = [];
  let cx = x + dx;
  let cy = y + dy;
  for (let block = world.get(cx, cy); block; block = world.get(cx, cy)) {
    if (chain.length === MAX_PUSH || !isMovable(block)) return undefined;
    chain.push([cx, cy, block]);
    cx += dx;
    cy += dy;
  }
  if (!isInWorld(cx, cy)) return undefined;

  const moves: BlockMove[] = chain
    .reverse()
    .map(([fromX, fromY, block]) => ({ block, fromX, fromY, toX: fromX + dx, toY: fromY + dy }));
  moves.push({
    block: { type: 'piston_head', facing: target.facing },
    fromX: x,
    fromY: y,
    toX: x + dx,
    toY: y + dy,
  });
  const claims = [cellKey(x, y), ...moves.map((move) => cellKey(move.toX, move.toY))];
  return { x, y, piston: target, claims, moves };
}

function planRetract(x: number, y: number, target: Piston): PistonPlan {
  const [dx, dy] = offset(target.facing);
  const head = { type: 'piston_head', facing: target.facing } as const;
  return {
    x,
    y,
    piston: target,
    claims: [cellKey(x, y), cellKey(x + dx, y + dy)],
    moves: [{ block: head, fromX: x + dx, fromY: y + dy, toX: x, toY: y }],
  };
}

/** The other half of an extended piston (its head, or the piston behind a head). */
export function pistonPartner(
  world: ReadonlyWorld,
  x: number,
  y: number,
): [number, number] | undefined {
  const block = world.get(x, y);
  if (block?.type === 'piston' && block.extended) {
    const [dx, dy] = offset(block.facing);
    return [x + dx, y + dy];
  }
  if (block?.type === 'piston_head') {
    const [dx, dy] = offset(opposite(block.facing));
    return [x + dx, y + dy];
  }
  return undefined;
}

/** Describes the first piston without its head (or head without its piston), if any. */
export function findBrokenPiston(world: ReadonlyWorld): string | undefined {
  let problem: string | undefined;
  world.forEach((x, y, block) => {
    if (problem) return;
    const partner = pistonPartner(world, x, y);
    if (!partner || (block.type !== 'piston' && block.type !== 'piston_head')) return;
    const other = world.get(...partner);
    const matches =
      block.type === 'piston'
        ? other?.type === 'piston_head' && other.facing === block.facing
        : other?.type === 'piston' && other.extended && other.facing === block.facing;
    if (!matches) problem = `The ${block.type} at (${x}, ${y}) has no matching other half`;
  });
  return problem;
}
