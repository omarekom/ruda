import { attachesWire } from './blocks';
import { offset, opposite, type Direction } from './coords';
import type { ReadonlyWorld } from './world';

/** Whether a wire at (x, y) attaches to its neighbour on the given side. */
export function wireAttaches(world: ReadonlyWorld, x: number, y: number, side: Direction): boolean {
  const [dx, dy] = offset(side);
  const neighbour = world.get(x + dx, y + dy);
  return neighbour !== undefined && attachesWire(neighbour, opposite(side));
}
