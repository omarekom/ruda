import { cellKey } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { Sketch, type Point } from '../sketch';

const FONT: Readonly<Record<string, readonly string[]>> = {
  R: ['XX.', 'X.X', 'XX.', 'X.X', 'X.X'],
  U: ['X.X', 'X.X', 'X.X', 'X.X', 'XXX'],
  D: ['XX.', 'X.X', 'X.X', 'X.X', 'XX.'],
  A: ['.X.', 'X.X', 'XXX', 'X.X', 'X.X'],
};
const TEXT = 'RUDA';
const GLYPH_WIDTH = 3;
const GLYPH_HEIGHT = 5;
const SPACING = 4;

export const sign: Creation = {
  slug: 'lamp-sign',
  title: 'Lamp sign',
  description:
    'The word RUDA written in lamps. One wire network runs around all the letters; flip the ' +
    'lever on the left to light the whole sign.',
  build() {
    const sketch = new Sketch();
    const lamps = new Set<number>();
    const lampCells: Point[] = [];
    [...TEXT].forEach((letter, index) => {
      FONT[letter]?.forEach((row, y) => {
        [...row].forEach((pixel, x) => {
          if (pixel !== 'X') return;
          const cell: Point = [index * SPACING + x, y];
          lamps.add(cellKey(...cell));
          lampCells.push(cell);
        });
      });
    });

    // Wire fills the background reachable from the border, so every lamp touches the network;
    // holes enclosed by a letter stay empty.
    const minX = -1;
    const minY = -1;
    const maxX = (TEXT.length - 1) * SPACING + GLYPH_WIDTH;
    const maxY = GLYPH_HEIGHT;
    const seen = new Set<number>();
    const stack: Point[] = [[minX, minY]];
    for (let cell = stack.pop(); cell; cell = stack.pop()) {
      const [x, y] = cell;
      const key = cellKey(x, y);
      if (x < minX || x > maxX || y < minY || y > maxY || seen.has(key) || lamps.has(key)) continue;
      seen.add(key);
      sketch.put(x, y, { type: 'wire' });
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    lampCells.forEach(([x, y], i) => sketch.put(x, y, { type: 'lamp' }).mark(`lamp${i}`, x, y));
    sketch.put(minX - 1, 2, { type: 'lever', on: false }).mark('lever', minX - 1, 2);
    return finish(sketch);
  },
};
