import { BUTTON_TICKS } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { adders } from '../src/creations/adders';
import { chaser, LAMPS_PER_RING } from '../src/creations/chaser';
import { CLOCK_DELAYS, clocks } from '../src/creations/clocks';
import { gates } from '../src/creations/gates';
import { memory } from '../src/creations/memory';
import { pistons } from '../src/creations/pistons';
import { EDGE_DELAY, LINE_DELAY, pulses } from '../src/creations/pulses';
import { sign } from '../src/creations/sign';
import { tour } from '../src/creations/tour';
import { Bench, combinations } from './helpers';

describe('Block tour', () => {
  it('shows each block working', () => {
    const bench = new Bench(tour);
    expect(bench.lit('leverLamp')).toBe(false);
    bench.setLever('lever', true);
    expect(bench.lit('leverLamp')).toBe(true);
    expect(bench.lit('blockLamp')).toBe(true);
    bench.press('button');
    expect(bench.lit('buttonLamp')).toBe(true);
    expect(bench.lit('inverterLamp')).toBe(true);
    bench.setLever('inverterLever', true);
    bench.settle();
    expect(bench.lit('inverterLamp')).toBe(false);
    bench.setLever('crossingHorizontal', true);
    expect([bench.lit('horizontalLamp'), bench.lit('verticalLamp')]).toEqual([true, false]);
    bench.setLever('delayerLever', true);
    expect(bench.trace('delayerLamp', 4)).toEqual([0, 0, 0, 1]);
    bench.setLever('pistonLever', true);
    bench.simulation.step();
    expect(bench.lit('pistonLamp')).toBe(true);
  });
});

describe('Logic gates', () => {
  const truth: Readonly<Record<string, (a: boolean, b: boolean) => boolean>> = {
    or: (a, b) => a || b,
    nor: (a, b) => !(a || b),
    and: (a, b) => a && b,
    nand: (a, b) => !(a && b),
    xor: (a, b) => a !== b,
  };

  it('NOT inverts its lever', () => {
    const bench = new Bench(gates);
    for (const a of [false, true, false]) {
      bench.setLever('not.a', a);
      bench.settle();
      expect(bench.lit('not.out')).toBe(!a);
    }
  });

  it.each(Object.keys(truth))('%s follows its truth table', (gate) => {
    const bench = new Bench(gates);
    for (const [a, b] of combinations(2)) {
      bench.setLever(`${gate}.a`, a ?? false);
      bench.setLever(`${gate}.b`, b ?? false);
      bench.settle();
      expect(bench.lit(`${gate}.out`), `${gate}(${a}, ${b})`).toBe(
        truth[gate]?.(a ?? false, b ?? false),
      );
    }
  });
});

describe('Clocks', () => {
  it.each(CLOCK_DELAYS.map((delays, i) => [i, delays] as const))(
    'clock %i blinks with a period of twice its loop delay',
    (index, delays) => {
      const bench = new Bench(clocks);
      const period = 2 * (1 + delays.reduce((sum, d) => sum + d, 0));
      const trace = bench.trace(`clock${index}.lamp`, period * 4);
      for (let i = period; i < trace.length; i++) expect(trace[i]).toBe(trace[i - period]);
      const onTicks = trace.slice(0, period).filter((on) => on === 1).length;
      expect(onTicks).toBe(period / 2);
    },
  );
});

describe('Light chaser', () => {
  const litLamps = (bench: Bench, ring: string) =>
    Array.from({ length: LAMPS_PER_RING }, (_, i) => i).filter((i) =>
      bench.lit(`${ring}.lamp${i}`),
    );

  it.each([
    ['single', 1],
    ['triple', 3],
  ] as const)('the %s ring always shows %i light(s), moving forward', (ring, count) => {
    const bench = new Bench(chaser);
    let previous = litLamps(bench, ring);
    for (let tick = 0; tick < 60; tick++) {
      bench.simulation.step();
      const current = litLamps(bench, ring);
      expect(current).toHaveLength(count);
      for (const lamp of current) {
        const advanced = previous.some((p) => p === lamp || (p + 1) % LAMPS_PER_RING === lamp);
        expect(advanced).toBe(true);
      }
      previous = current;
    }
  });
});

describe('Pulse tools', () => {
  it('blinks once on a rising edge', () => {
    const bench = new Bench(pulses);
    bench.setLever('rising.lever', true);
    const on = bench.trace('rising.out', 12);
    expect(on.filter((x) => x === 1)).toHaveLength(EDGE_DELAY - 1);
    bench.setLever('rising.lever', false);
    expect(bench.trace('rising.out', 12)).not.toContain(1);
  });

  it('blinks once on a falling edge', () => {
    const bench = new Bench(pulses);
    bench.setLever('falling.lever', true);
    expect(bench.trace('falling.out', 12)).not.toContain(1);
    bench.setLever('falling.lever', false);
    expect(bench.trace('falling.out', 12).filter((x) => x === 1)).toHaveLength(EDGE_DELAY - 1);
  });

  it('passes a button pulse down the delay line', () => {
    const bench = new Bench(pulses);
    bench.press('line.button');
    expect(bench.lit('line.lamp0')).toBe(true);
    const traces = [0, 1, 2, 3].map(() => [] as number[]);
    for (let tick = 1; tick <= BUTTON_TICKS + 3 * LINE_DELAY + 2; tick++) {
      bench.simulation.step();
      traces.forEach((trace, i) => trace.push(bench.lit(`line.lamp${i}`) ? 1 : 0));
    }
    // Lamp i first lights i delays after the press.
    traces.slice(1).forEach((trace, i) => expect(trace.indexOf(1) + 1).toBe((i + 1) * LINE_DELAY));
  });
});

describe('Memory cell', () => {
  it('remembers the last button pressed', () => {
    const bench = new Bench(memory);
    expect([bench.lit('q'), bench.lit('notQ')]).toEqual([false, true]);
    for (const [button, q] of [
      ['set', true],
      ['set', true],
      ['reset', false],
      ['set', true],
    ] as const) {
      bench.press(button);
      bench.settle();
      expect([bench.lit('q'), bench.lit('notQ')]).toEqual([q, !q]);
    }
  });
});

describe('Adders', () => {
  it('half adder adds two bits', () => {
    const bench = new Bench(adders);
    for (const [a = false, b = false] of combinations(2)) {
      bench.setLever('half.a', a);
      bench.setLever('half.b', b);
      bench.settle();
      const total = Number(a) + Number(b);
      expect([bench.lit('half.carry'), bench.lit('half.sum')]).toEqual([
        total >= 2,
        total % 2 === 1,
      ]);
    }
  });

  it('full adder adds three bits', () => {
    const bench = new Bench(adders);
    for (const [a = false, b = false, c = false] of combinations(3)) {
      bench.setLever('full.a', a);
      bench.setLever('full.b', b);
      bench.setLever('full.carryIn', c);
      bench.settle();
      const total = Number(a) + Number(b) + Number(c);
      expect([bench.lit('full.carry'), bench.lit('full.sum')], `${a}+${b}+${c}`).toEqual([
        total >= 2,
        total % 2 === 1,
      ]);
    }
  });

  it('2-bit adder adds two numbers from 0 to 3', () => {
    const bench = new Bench(adders);
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        bench.setLever('two.a0', (x & 1) === 1);
        bench.setLever('two.a1', (x & 2) === 2);
        bench.setLever('two.b0', (y & 1) === 1);
        bench.setLever('two.b1', (y & 2) === 2);
        bench.settle();
        const lamps =
          Number(bench.lit('two.carry')) * 4 +
          Number(bench.lit('two.sum1')) * 2 +
          Number(bench.lit('two.sum0'));
        expect(lamps, `${x} + ${y}`).toBe(x + y);
      }
    }
  });
});

describe('Piston switches', () => {
  const extended = (bench: Bench, name: string) =>
    bench.simulation.blocks.get(...bench.point(name));

  it('toggles a redstone block between two pistons', () => {
    const bench = new Bench(pistons);
    expect(bench.lit('toggle.lamp')).toBe(false);
    bench.setLever('toggle.left', true);
    bench.settle();
    expect(bench.lit('toggle.lamp')).toBe(true);
    bench.setLever('toggle.left', false);
    bench.settle();
    expect(bench.lit('toggle.lamp')).toBe(true);
    bench.setLever('toggle.right', true);
    bench.settle();
    expect(bench.lit('toggle.lamp')).toBe(false);
  });

  it('cannot push a wire, can push 12 stones but not 13', () => {
    const bench = new Bench(pistons);
    bench.setLever('blocked.lever', true);
    bench.setLever('twelve.lever', true);
    bench.setLever('thirteen.lever', true);
    bench.simulation.step(3);
    expect(extended(bench, 'blocked.piston')).toMatchObject({ extended: false });
    expect(extended(bench, 'twelve.piston')).toMatchObject({ extended: true });
    expect(extended(bench, 'thirteen.piston')).toMatchObject({ extended: false });
  });
});

describe('Lamp sign', () => {
  it('lights every letter lamp with the lever, and none without', () => {
    const bench = new Bench(sign);
    const lampNames = [...sign.build().points.keys()].filter((name) => name.startsWith('lamp'));
    expect(lampNames.length).toBeGreaterThan(30);
    expect(lampNames.some((name) => bench.lit(name))).toBe(false);
    bench.setLever('lever', true);
    expect(lampNames.every((name) => bench.lit(name))).toBe(true);
  });
});
