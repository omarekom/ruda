import { finish, type Creation } from '../creation';
import { Sketch } from '../sketch';

interface Gate {
  readonly name: string;
  /** The map; `a`, `b` and `out` are the inputs and the output lamp within it. */
  readonly map: string;
  readonly a: readonly [number, number];
  readonly b?: readonly [number, number];
  readonly out: readonly [number, number];
}

// Two-input gates have their levers at the top and bottom of the left column.
const GATES: readonly Gate[] = [
  { name: 'not', map: '....\nL->o\n....', a: [0, 1], out: [3, 1] },
  { name: 'or', map: 'L-.\n.-o\nL-.', a: [0, 0], b: [0, 2], out: [2, 1] },
  { name: 'nor', map: 'L-..\n.->o\nL-..', a: [0, 0], b: [0, 2], out: [3, 1] },
  { name: 'and', map: 'L>-..\n..->o\nL>-..', a: [0, 0], b: [0, 2], out: [4, 1] },
  { name: 'nand', map: 'L>-.\n..-o\nL>-.', a: [0, 0], b: [0, 2], out: [3, 1] },
  {
    // (A or B) and not (A and B): the OR network and the NAND network each feed an
    // inverter, the inverters share a network, and a last inverter gives the result.
    name: 'xor',
    map: [
      '-------',
      '^.....-',
      'L-....-',
      '.-....-',
      '.->--<-',
      '.-..v.-',
      'L-..o.-',
      'v.....-',
      '-------',
    ].join('\n'),
    a: [0, 2],
    b: [0, 6],
    out: [4, 6],
  },
];

const TALLEST = 9;

export const gates: Creation = {
  slug: 'logic-gates',
  title: 'Logic gates',
  description:
    'NOT, OR, NOR, AND, NAND and XOR, left to right. Flip the levers on the left of each gate ' +
    'and watch its lamp. AND, NAND and XOR are built only from torches and wires.',
  build() {
    const sketch = new Sketch();
    let x = 0;
    for (const gate of GATES) {
      const rows = gate.map.split('\n');
      const width = Math.max(...rows.map((row) => row.length));
      const ox = x + 2;
      const oy = Math.floor((TALLEST - rows.length) / 2);
      sketch.frame(x, -2, x + width + 3, TALLEST + 1).draw(ox, oy, gate.map);
      sketch.mark(`${gate.name}.a`, ox + gate.a[0], oy + gate.a[1]);
      if (gate.b) sketch.mark(`${gate.name}.b`, ox + gate.b[0], oy + gate.b[1]);
      sketch.mark(`${gate.name}.out`, ox + gate.out[0], oy + gate.out[1]);
      x += width + 5;
    }
    return finish(sketch);
  },
};
