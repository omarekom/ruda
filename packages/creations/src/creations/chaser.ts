import { Direction, type Block } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { delayer, Sketch } from '../sketch';
import type { Point } from '../sketch';

const SIDE = 7;
const DELAY = 2;
const EDGE = SIDE - 1;
/** Travel direction and outward direction of each edge, clockwise from the top. */
const EDGES: readonly { readonly travel: Direction; readonly out: Point }[] = [
  { travel: Direction.East, out: [0, -1] },
  { travel: Direction.South, out: [1, 0] },
  { travel: Direction.West, out: [0, 1] },
  { travel: Direction.North, out: [-1, 0] },
];

/** The cells of a square ring, clockwise from the top-left corner. */
function ringCells(): Point[] {
  const cells: Point[] = [];
  for (let i = 0; i < EDGE; i++) cells.push([i, 0]);
  for (let i = 0; i < EDGE; i++) cells.push([EDGE, i]);
  for (let i = 0; i < EDGE; i++) cells.push([EDGE - i, EDGE]);
  for (let i = 0; i < EDGE; i++) cells.push([0, EDGE - i]);
  return cells;
}

/**
 * A ring alternating wires and delayers, with a lamp outside every wire. A signal stored in a
 * delayer travels around the ring forever. `pulses` are the delayers that start carrying one.
 */
function ring(sketch: Sketch, ox: number, oy: number, name: string, pulses: readonly number[]) {
  ringCells().forEach(([x, y], index) => {
    const edge = EDGES[Math.floor(index / EDGE)];
    if (!edge) throw new Error('Ring index out of range');
    let block: Block;
    if (index % 2 === 0) {
      block = { type: 'wire' };
      const lampX = ox + x + edge.out[0];
      const lampY = oy + y + edge.out[1];
      sketch.put(lampX, lampY, { type: 'lamp' }).mark(`${name}.lamp${index / 2}`, lampX, lampY);
    } else {
      block = delayer(edge.travel, DELAY, pulses.includes(index));
    }
    sketch.put(ox + x, oy + y, block);
  });
}

export const LAMPS_PER_RING = (4 * EDGE) / 2;

export const chaser: Creation = {
  slug: 'light-chaser',
  title: 'Light chaser',
  description:
    'Rings of delayers pass signals around in a loop, lighting one lamp after another. The left ' +
    'ring carries one light, the right ring three. Click a delayer to change its delay ' +
    'and the lights bunch up or spread out.',
  build() {
    const sketch = new Sketch();
    ring(sketch, 0, 0, 'single', [1]);
    ring(sketch, SIDE + 5, 0, 'triple', [1, 9, 17]);
    return finish(sketch);
  },
};
