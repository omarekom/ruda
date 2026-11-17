import { Simulation, type World } from '@ruda/core';
import type { Point, Sketch } from './sketch';

/** A ready-made world for the library. */
export interface Creation {
  /** Stable identifier, also the seed file name. */
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  build(): BuiltCreation;
}

export interface BuiltCreation {
  readonly world: World;
  /** Named cells (inputs, outputs) used by tests. */
  readonly points: ReadonlyMap<string, Point>;
}

/** Most creations start not mid-transition; circuits that never settle stop after the limit. */
const SETTLE_TICKS = 200;

export function finish(sketch: Sketch): BuiltCreation {
  new Simulation(sketch.world).runUntilStable(SETTLE_TICKS);
  return { world: sketch.world, points: sketch.points };
}
