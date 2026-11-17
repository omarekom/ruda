import { Direction, MAX_DELAY, World, type Block } from '@ruda/core';

const WIDTH = 20;
const HEIGHT = 9;
const DELAYERS = 8;
/** Delayers that start full, i.e. the length of the travelling pulse in delayer stages. */
const PULSE_STAGES = 2;

type Cell = readonly [number, number];

/** The ring's cells, clockwise from the top-left corner. */
function perimeter(): Cell[] {
  const cells: Cell[] = [];
  for (let x = 0; x < WIDTH; x++) cells.push([x, 0]);
  for (let y = 1; y < HEIGHT; y++) cells.push([WIDTH - 1, y]);
  for (let x = WIDTH - 2; x >= 0; x--) cells.push([x, HEIGHT - 1]);
  for (let y = HEIGHT - 2; y > 0; y--) cells.push([0, y]);
  return cells;
}

function directionBetween([ax, ay]: Cell, [bx, by]: Cell): Direction {
  if (bx > ax) return Direction.East;
  if (bx < ax) return Direction.West;
  return by > ay ? Direction.South : Direction.North;
}

/** The side facing away from the ring's inside. */
function outward([x, y]: Cell): Direction {
  if (y === 0) return Direction.North;
  if (y === HEIGHT - 1) return Direction.South;
  return x === 0 ? Direction.West : Direction.East;
}

const STEP: Readonly<Record<Direction, Cell>> = {
  [Direction.North]: [0, -1],
  [Direction.East]: [1, 0],
  [Direction.South]: [0, 1],
  [Direction.West]: [-1, 0],
};

/**
 * A calm backdrop: a ring of slow delayers carrying one pulse round and round. Lamps sit by
 * every other stretch of wire, so one lamp at a time lights up and hands over to the next.
 */
export function lightRing(): World {
  const cells = perimeter();
  const isCorner = (i: number): boolean => {
    const prev = cells[(i - 1 + cells.length) % cells.length];
    const next = cells[(i + 1) % cells.length];
    return !prev || !next || (prev[0] !== next[0] && prev[1] !== next[1]);
  };
  const straight = cells.map((_, i) => i).filter((i) => !isCorner(i));
  const delayerAt = Array.from(
    { length: DELAYERS },
    (_, k) => straight[Math.floor((k * straight.length) / DELAYERS)] ?? 0,
  );

  const world = new World();
  cells.forEach((cell, i) => {
    const stage = delayerAt.indexOf(i);
    const next = cells[(i + 1) % cells.length] ?? cell;
    const block: Block =
      stage === -1
        ? { type: 'wire' }
        : {
            type: 'delayer',
            facing: directionBetween(cell, next),
            line: Array<boolean>(MAX_DELAY).fill(stage < PULSE_STAGES),
          };
    world.set(cell[0], cell[1], block);
  });

  // A lamp beside the middle of every other wire stretch, on the outside of the ring.
  for (let stage = 0; stage < DELAYERS; stage += 2) {
    const from = delayerAt[stage] ?? 0;
    const to = delayerAt[(stage + 1) % DELAYERS] ?? 0;
    const length = (to - from + cells.length) % cells.length;
    const middle = cells[(from + Math.floor(length / 2)) % cells.length];
    if (!middle) continue;
    const [dx, dy] = STEP[outward(middle)];
    world.set(middle[0] + dx, middle[1] + dy, { type: 'lamp' });
  }
  return world;
}
