/** Cells are integers in [WORLD_MIN, WORLD_MAX) on both axes. */
export const WORLD_MIN = -32000;
export const WORLD_MAX = 32000;

/** x grows east, y grows south. */
export enum Direction {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
}

export const DIRECTIONS: readonly Direction[] = [
  Direction.North,
  Direction.East,
  Direction.South,
  Direction.West,
];

export enum Axis {
  Horizontal = 0,
  Vertical = 1,
}

const OFFSETS: Readonly<Record<Direction, readonly [number, number]>> = {
  [Direction.North]: [0, -1],
  [Direction.East]: [1, 0],
  [Direction.South]: [0, 1],
  [Direction.West]: [-1, 0],
};

export function offset(direction: Direction): readonly [number, number] {
  return OFFSETS[direction];
}

export function opposite(direction: Direction): Direction {
  return ((direction + 2) % 4) as Direction;
}

export function rotateClockwise(direction: Direction): Direction {
  return ((direction + 1) % 4) as Direction;
}

export function axisOf(direction: Direction): Axis {
  return direction === Direction.East || direction === Direction.West
    ? Axis.Horizontal
    : Axis.Vertical;
}

export function isInWorld(x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= WORLD_MIN &&
    x < WORLD_MAX &&
    y >= WORLD_MIN &&
    y < WORLD_MAX
  );
}

// Coordinates are biased by 2^15 so a cell key is a non-negative integer below 2^32.
const CELL_BIAS = 32768;
const CELL_SPAN = 65536;

/** A unique number per cell; callers must pass in-world coordinates. */
export function cellKey(x: number, y: number): number {
  return (x + CELL_BIAS) * CELL_SPAN + (y + CELL_BIAS);
}

export function cellFromKey(key: number): [number, number] {
  return [Math.floor(key / CELL_SPAN) - CELL_BIAS, (key % CELL_SPAN) - CELL_BIAS];
}
