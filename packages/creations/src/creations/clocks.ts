import { Direction } from '@ruda/core';
import { finish, type Creation } from '../creation';
import { delayer, Sketch, torch } from '../sketch';

/** Delayers in each clock's loop; a loop of total delay d blinks with a period of 2d ticks. */
export const CLOCK_DELAYS: readonly (readonly number[])[] = [[], [1], [4], [4, 4]];

export const clocks: Creation = {
  slug: 'clocks',
  title: 'Clocks',
  description:
    'A torch wired back into itself is the fastest clock: it flips every tick (5 blinks per ' +
    'second). Each clock below adds delayers to the loop: 2.5 blinks per second, 1 per second, ' +
    'and slower still. The lamp next to each loop shows its rhythm.',
  build() {
    const sketch = new Sketch();
    CLOCK_DELAYS.forEach((delays, index) => {
      const y = index * 4;
      sketch.put(0, y + 1, { type: 'wire' }).put(1, y + 1, torch(Direction.East));
      delays.forEach((delay, i) => sketch.put(2 + i, y + 1, delayer(Direction.East, delay)));
      const end = 2 + delays.length;
      sketch.put(end, y + 1, { type: 'wire' }).put(end + 1, y + 1, { type: 'lamp' });
      for (let x = 0; x <= end; x++) sketch.put(x, y + 2, { type: 'wire' });
      sketch.mark(`clock${index}.lamp`, end + 1, y + 1);
    });
    return finish(sketch);
  },
};
