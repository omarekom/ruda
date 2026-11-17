import { Direction, MAX_PUSH } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { piston, Sketch } from '../sketch';

const legend = { p: piston(Direction.East), q: piston(Direction.West) };

export const pistons: Creation = {
  slug: 'piston-switches',
  title: 'Piston switches',
  description:
    'Top: two pistons push a redstone block back and forth; flip the left lever, then back, then ' +
    'the right lever. The lamp shows where the block is. Middle: a piston cannot push a wire, so ' +
    'it stays put. Bottom: a piston pushes 12 stones, but not 13.',
  build() {
    const sketch = new Sketch()
      .draw(0, 0, 'Lp#.qL\n...o..', legend)
      .draw(0, 3, 'Lp-o', legend)
      .draw(0, 5, `Lp${'S'.repeat(MAX_PUSH)}`, legend)
      .draw(0, 7, `Lp${'S'.repeat(MAX_PUSH + 1)}`, legend);
    sketch
      .mark('toggle.left', 0, 0)
      .mark('toggle.right', 5, 0)
      .mark('toggle.lamp', 3, 1)
      .mark('blocked.lever', 0, 3)
      .mark('blocked.piston', 1, 3)
      .mark('twelve.lever', 0, 5)
      .mark('twelve.piston', 1, 5)
      .mark('thirteen.lever', 0, 7)
      .mark('thirteen.piston', 1, 7);
    return finish(sketch);
  },
};
