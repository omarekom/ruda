import { Direction } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { delayer, Sketch } from '../sketch';

/** The pulse length of the edge detectors is this delay minus one tick. */
export const EDGE_DELAY = 4;
export const LINE_DELAY = 4;

const legend = {
  d: delayer(Direction.East, EDGE_DELAY),
  w: delayer(Direction.East, LINE_DELAY),
};

export const pulses: Creation = {
  slug: 'pulse-tools',
  title: 'Pulse tools',
  description:
    'Top: a rising-edge detector, the right lamp blinks once when you switch the lever on. ' +
    'Middle: a falling-edge detector, it blinks when you switch the lever off. Bottom: a delay ' +
    'line, press the button and watch the pulse travel from lamp to lamp.',
  build() {
    // The signal reaches the output inverter directly through a torch and late through a
    // delayer; only between those two moments are both inputs of the inverter off.
    const sketch = new Sketch()
      .draw(0, 0, '.->-..\nL-.->o\no-d-..', legend)
      .draw(0, 5, '..->-..\nL>-.->o\no.-d-..', legend)
      .draw(0, 10, 'B-w-w-w-\n.o.o.o.o', legend);
    sketch
      .mark('rising.lever', 0, 1)
      .mark('rising.out', 5, 1)
      .mark('falling.lever', 0, 6)
      .mark('falling.out', 6, 6)
      .mark('line.button', 0, 10);
    for (let i = 0; i < 4; i++) sketch.mark(`line.lamp${i}`, 1 + 2 * i, 11);
    return finish(sketch);
  },
};
