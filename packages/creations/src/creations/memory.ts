import { Direction } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { Sketch, torch } from '../sketch';

export const memory: Creation = {
  slug: 'memory-cell',
  title: 'Memory cell',
  description:
    'Two torches that switch each other off form a latch, the simplest memory. Press the right ' +
    'button to set it (right lamp on) and the left button to reset it (left lamp on). The lamps ' +
    'keep showing the last button you pressed.',
  build() {
    // Each torch reads a network fed by the other torch and by one button, so the cell has
    // exactly two stable states. It is saved in the reset state; starting both torches equal
    // would make them flip together forever.
    const sketch = new Sketch().draw(0, 0, '..o..o.\n..->--.\n.B-..-B\n..--{-.', {
      '{': torch(Direction.West, true),
    });
    sketch.mark('reset', 1, 2).mark('set', 6, 2).mark('q', 5, 0).mark('notQ', 2, 0);
    return finish(sketch);
  },
};
