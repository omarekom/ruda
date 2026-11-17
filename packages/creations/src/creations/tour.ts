import { Direction } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { delayer, piston, Sketch } from '../sketch';

export const tour: Creation = {
  slug: 'block-tour',
  title: 'Block tour',
  description:
    'Every block in a tiny working example, top to bottom: lever, redstone block and button ' +
    'lighting a lamp; a torch inverting a lever; a crossing carrying two separate signals; a ' +
    'delayer holding a signal back; a piston pushing a redstone block next to a lamp; a stone wall.',
  build() {
    const sketch = new Sketch()
      .draw(0, 0, 'L-o')
      .draw(0, 2, '#-o')
      .draw(0, 4, 'B-o')
      .draw(0, 6, 'L>o')
      .draw(0, 8, '.L..\nL+-o\n.-..\n.o..')
      .draw(0, 13, 'L-4-o', { '4': delayer(Direction.East, 4) })
      .draw(0, 15, 'Lp#.o', { p: piston(Direction.East) })
      .draw(0, 17, 'SSSSS');
    sketch
      .mark('lever', 0, 0)
      .mark('leverLamp', 2, 0)
      .mark('blockLamp', 2, 2)
      .mark('button', 0, 4)
      .mark('buttonLamp', 2, 4)
      .mark('inverterLever', 0, 6)
      .mark('inverterLamp', 2, 6)
      .mark('crossingHorizontal', 0, 9)
      .mark('crossingVertical', 1, 8)
      .mark('horizontalLamp', 3, 9)
      .mark('verticalLamp', 1, 11)
      .mark('delayerLever', 0, 13)
      .mark('delayerLamp', 4, 13)
      .mark('pistonLever', 0, 15)
      .mark('pistonLamp', 4, 15);
    return finish(sketch);
  },
};
