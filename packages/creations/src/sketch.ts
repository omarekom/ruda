import { createBlock, Direction, World, type Block } from '@ruda/core';

export type Legend = Readonly<Record<string, Block>>;
export type Point = readonly [number, number];

export function torch(facing: Direction, lit = false): Block {
  return { type: 'torch', facing, lit };
}

export function delayer(facing: Direction, delay: number, signal = false): Block {
  return { type: 'delayer', facing, line: new Array<boolean>(delay).fill(signal) };
}

export function piston(facing: Direction): Block {
  return createBlock('piston', facing);
}

/**
 * Characters every map understands: `#` redstone block, `L` / `l` lever off / on, `B` button,
 * `-` wire, `+` crossing, `o` lamp, `S` stone, `^ > v <` unlit torch facing that way,
 * `.` and space empty. Maps add their own characters for anything else.
 */
const BASE_LEGEND: Legend = {
  '#': { type: 'redstone_block' },
  L: { type: 'lever', on: false },
  l: { type: 'lever', on: true },
  B: { type: 'button', remaining: 0 },
  '-': { type: 'wire' },
  '+': { type: 'crossing' },
  o: { type: 'lamp' },
  S: { type: 'stone' },
  '^': torch(Direction.North),
  '>': torch(Direction.East),
  v: torch(Direction.South),
  '<': torch(Direction.West),
};

/** Builds a world from ASCII maps and remembers named points for tests and descriptions. */
export class Sketch {
  readonly world = new World();
  private readonly marks = new Map<string, Point>();

  /** Draws a map with its top-left character at (x, y). Overlapping blocks are a mistake. */
  draw(x: number, y: number, map: string, legend: Legend = {}): this {
    const rows = map
      .replace(/^\n/, '')
      .replace(/\n\s*$/, '')
      .split('\n');
    rows.forEach((row, dy) => {
      [...row].forEach((char, dx) => {
        if (char === '.' || char === ' ') return;
        const block = legend[char] ?? BASE_LEGEND[char];
        if (!block) throw new Error(`Unknown map character "${char}"`);
        this.put(x + dx, y + dy, block);
      });
    });
    return this;
  }

  put(x: number, y: number, block: Block): this {
    if (this.world.get(x, y)) throw new Error(`Cell (${x}, ${y}) is already used`);
    this.world.set(x, y, block);
    return this;
  }

  /** A stone outline around the inclusive rectangle. */
  frame(x0: number, y0: number, x1: number, y1: number): this {
    for (let x = x0; x <= x1; x++) this.put(x, y0, { type: 'stone' }).put(x, y1, { type: 'stone' });
    for (let y = y0 + 1; y < y1; y++)
      this.put(x0, y, { type: 'stone' }).put(x1, y, { type: 'stone' });
    return this;
  }

  mark(name: string, x: number, y: number): this {
    if (this.marks.has(name)) throw new Error(`Point "${name}" is already marked`);
    this.marks.set(name, [x, y]);
    return this;
  }

  get points(): ReadonlyMap<string, Point> {
    return this.marks;
  }
}
