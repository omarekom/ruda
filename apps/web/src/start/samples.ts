import { delayer, Sketch } from '@ruda/creations';
import { Direction, Simulation, type World } from '@ruda/core';

/** Four tiny circuits side by side: a lever, an inverter, a power source with a delay, and off. */
const MAP = `
l---o...L---o
.............
L->-o...#D--o
`;

const SETTLE_TICKS = 20;

/** A tidy, settled example for the start screen's expert side. */
export function sampleCircuits(): World {
  const { world } = new Sketch().draw(0, 0, MAP, { D: delayer(Direction.East, 2, true) });
  new Simulation(world).runUntilStable(SETTLE_TICKS);
  return world;
}
