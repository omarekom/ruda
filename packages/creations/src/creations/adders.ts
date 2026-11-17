import { Direction } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { delayer, Sketch, type Point } from '../sketch';

/**
 * A half adder whose inputs are the wire cells at local (0, 1) and (0, 5). The carry comes out
 * at (8, 1) and the sum at (9, 3), each as the front cell of an output torch.
 *
 * Each input feeds an inverter and a delayer. The delayers form A OR B, the inverters
 * NOT A OR NOT B (a NAND). Inverting the NAND gives the carry A AND B; combining it with the
 * inverted OR and inverting once more gives the sum A XOR B.
 */
const HALF_ADDER = [
  '..........',
  '->----->..',
  'd...v.-...',
  '->----+->.',
  'u.....-...',
  '->-----...',
].join('\n');

const legend = {
  d: delayer(Direction.South, 1),
  u: delayer(Direction.North, 1),
};

interface AdderPorts {
  readonly a: Point;
  readonly b: Point;
  readonly carry: Point;
  readonly sum: Point;
}

function halfAdder(sketch: Sketch, ox: number, oy: number): AdderPorts {
  sketch.draw(ox, oy, HALF_ADDER, legend);
  return { a: [ox, oy + 1], b: [ox, oy + 5], carry: [ox + 8, oy + 1], sum: [ox + 9, oy + 3] };
}

/** Two half adders; the carries meet in one network. Carry in enters at the returned `carryIn`. */
function fullAdder(sketch: Sketch, ox: number, oy: number) {
  const first = halfAdder(sketch, ox, oy);
  const second = halfAdder(sketch, ox + 10, oy + 2);
  // First sum into the second adder's A input.
  sketch.put(...first.sum, { type: 'wire' });
  // Both carries join over the top of the second adder.
  const [cx, cy] = first.carry;
  sketch.put(cx, cy, { type: 'wire' });
  for (let x = cx; x <= second.carry[0]; x++) sketch.put(x, cy - 1, { type: 'wire' });
  for (let y = cy; y <= second.carry[1]; y++) sketch.put(second.carry[0], y, { type: 'wire' });
  const carryLamp: Point = [second.carry[0] + 1, cy - 1];
  sketch.put(...carryLamp, { type: 'lamp' }).put(...second.sum, { type: 'lamp' });
  return { a: first.a, b: first.b, carryIn: second.b, carryLamp, sumLamp: second.sum };
}

function lever(sketch: Sketch, name: string, input: Point): void {
  const [x, y] = input;
  sketch.put(x - 1, y, { type: 'lever', on: false }).mark(name, x - 1, y);
}

export const adders: Creation = {
  slug: 'adders',
  title: 'Adders',
  description:
    'Binary addition, the first step to a calculator. Top: a half adder (two levers, sum and ' +
    'carry lamps). Middle: a full adder with a third lever for the carry in; the top-right lamp ' +
    'is the carry out, the right lamp the sum. Bottom: a 2-bit adder; the upper lever pair is ' +
    'bit 1 of the two numbers, the lower pair bit 0, and the three lamps read carry, bit 1 and ' +
    'bit 0 of the result.',
  build() {
    const sketch = new Sketch();

    const half = halfAdder(sketch, 0, 0);
    lever(sketch, 'half.a', half.a);
    lever(sketch, 'half.b', half.b);
    sketch.put(...half.carry, { type: 'lamp' }).put(...half.sum, { type: 'lamp' });
    sketch.mark('half.carry', ...half.carry).mark('half.sum', ...half.sum);

    const full = fullAdder(sketch, 0, 12);
    lever(sketch, 'full.a', full.a);
    lever(sketch, 'full.b', full.b);
    lever(sketch, 'full.carryIn', full.carryIn);
    sketch.mark('full.carry', ...full.carryLamp).mark('full.sum', ...full.sumLamp);

    // 2-bit adder: a full adder for bit 1 above a half adder for bit 0, whose carry climbs
    // up into the full adder's carry in.
    const high = fullAdder(sketch, 0, 26);
    const low = halfAdder(sketch, 0, 38);
    const [lx, ly] = low.carry;
    for (let y = ly; y >= high.carryIn[1]; y--) sketch.put(lx, y, { type: 'wire' });
    sketch.put(lx + 1, high.carryIn[1], { type: 'wire' });
    sketch.put(...low.sum, { type: 'lamp' });
    lever(sketch, 'two.a1', high.a);
    lever(sketch, 'two.b1', high.b);
    lever(sketch, 'two.a0', low.a);
    lever(sketch, 'two.b0', low.b);
    sketch
      .mark('two.carry', ...high.carryLamp)
      .mark('two.sum1', ...high.sumLamp)
      .mark('two.sum0', ...low.sum);
    return finish(sketch);
  },
};
