import { createBlock, Direction, Simulation, type BlockType } from '../src';

/**
 * Builds a simulation from an ASCII map. Each character is one cell, the top-left
 * character is (0, 0). Legend: `#` redstone block, `L` lever off, `l` lever on,
 * `-` wire, `+` crossing, `o` lamp, `S` stone, `B` button, `>` `<` `^` `v` torch facing that
 * way, `)` delayer facing east (delay 1), `.` or space empty.
 */
export function simulationFrom(map: string): Simulation {
  const simulation = new Simulation();
  const rows = map
    .replace(/^\n/, '')
    .replace(/\n\s*$/, '')
    .split('\n');
  rows.forEach((row, y) => {
    [...row].forEach((char, x) => {
      const block = blockFor(char);
      if (block) simulation.execute({ kind: 'place', x, y, block });
    });
  });
  return simulation;
}

const SIMPLE: Readonly<Record<string, BlockType>> = {
  '#': 'redstone_block',
  L: 'lever',
  '-': 'wire',
  '+': 'crossing',
  o: 'lamp',
  S: 'stone',
  B: 'button',
};

const TORCHES: Readonly<Record<string, Direction>> = {
  '^': Direction.North,
  '>': Direction.East,
  v: Direction.South,
  '<': Direction.West,
};

function blockFor(char: string) {
  if (char === 'l') return { type: 'lever', on: true } as const;
  if (char === ')') return createBlock('delayer', Direction.East);
  const simple = SIMPLE[char];
  if (simple) return createBlock(simple);
  const facing = TORCHES[char];
  if (facing !== undefined) return createBlock('torch', facing);
  return undefined;
}
