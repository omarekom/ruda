import { describe, expect, it } from 'vitest';
import { Axis, BUTTON_TICKS, createBlock, Direction, MAX_DELAY } from '../src';
import { simulationFrom } from './helpers';

/** Records whether the lamp is lit after each of `ticks` ticks. */
function lampTrace(sim: ReturnType<typeof simulationFrom>, x: number, y: number, ticks: number) {
  const trace: number[] = [];
  for (let i = 0; i < ticks; i++) {
    sim.step();
    trace.push(sim.isLampLit(x, y) ? 1 : 0);
  }
  return trace;
}

describe('Delayer', () => {
  it('delays a signal by one tick by default', () => {
    const sim = simulationFrom('L-)o');
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    expect(sim.isLampLit(3, 0)).toBe(false);
    expect(lampTrace(sim, 3, 0, 2)).toEqual([1, 1]);
  });

  it('cycles its delay from 1 to MAX_DELAY and back', () => {
    const sim = simulationFrom(')');
    const delays: number[] = [];
    for (let i = 0; i < MAX_DELAY; i++) {
      sim.execute({ kind: 'interact', x: 0, y: 0 });
      const block = sim.blocks.get(0, 0);
      if (block?.type === 'delayer') delays.push(block.line.length);
    }
    expect(delays).toEqual([2, 3, 4, 1]);
  });

  it('reproduces any pulse exactly, shifted by its delay', () => {
    const sim = simulationFrom('L)o');
    sim.execute({ kind: 'interact', x: 1, y: 0 });
    sim.execute({ kind: 'interact', x: 1, y: 0 }); // delay 3
    const trace: number[] = [];
    const leverAt = [1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0];
    for (const on of leverAt) {
      const block = sim.blocks.get(0, 0);
      if (block?.type === 'lever' && block.on !== (on === 1)) {
        sim.execute({ kind: 'interact', x: 0, y: 0 });
      }
      sim.step();
      trace.push(sim.isLampLit(2, 0) ? 1 : 0);
    }
    // The lever state during tick N appears at the output after tick N + 3.
    expect(trace).toEqual([0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0]);
    expect(sim.isStable).toBe(true);
  });

  it('reads only its back and powers only its front', () => {
    const sim = simulationFrom(`
.#.
o)o
.#.`);
    sim.runUntilStable(10);
    expect(sim.isLampLit(2, 1)).toBe(false);
    expect(sim.isLampLit(0, 1)).toBe(false);
  });

  it('keeps its output when the delay changes', () => {
    const sim = simulationFrom('#)o');
    sim.step();
    expect(sim.isLampLit(2, 0)).toBe(true);
    sim.execute({ kind: 'interact', x: 1, y: 0 });
    expect(sim.isLampLit(2, 0)).toBe(true);
    sim.step(3);
    expect(sim.isLampLit(2, 0)).toBe(true);
  });

  it('feeds wires and torches', () => {
    const sim = simulationFrom('L)->-o');
    sim.runUntilStable(10);
    expect(sim.isLampLit(5, 0)).toBe(true);
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    expect(sim.runUntilStable(10)).toBe(2);
    expect(sim.isLampLit(5, 0)).toBe(false);
    expect(sim.isChannelPowered(2, 0, Axis.Horizontal)).toBe(true);
  });
});

describe('Button', () => {
  it(`powers its neighbours for ${BUTTON_TICKS} ticks after a press`, () => {
    const sim = simulationFrom('B-o');
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    expect(sim.isLampLit(2, 0)).toBe(true);
    const trace = lampTrace(sim, 2, 0, BUTTON_TICKS + 2);
    expect(trace).toEqual([...new Array<number>(BUTTON_TICKS - 1).fill(1), 0, 0, 0]);
    expect(sim.isStable).toBe(true);
  });

  it('ignores presses while already pressed', () => {
    const sim = simulationFrom('B');
    expect(sim.execute({ kind: 'interact', x: 0, y: 0 })).toBe(true);
    sim.step(3);
    expect(sim.execute({ kind: 'interact', x: 0, y: 0 })).toBe(false);
    sim.step(BUTTON_TICKS - 3);
    expect(sim.execute({ kind: 'interact', x: 0, y: 0 })).toBe(true);
  });

  it('starts unpressed when placed', () => {
    const sim = simulationFrom('.-o');
    sim.execute({ kind: 'place', x: 0, y: 0, block: createBlock('button', Direction.North) });
    expect(sim.runUntilStable(5)).toBe(1);
    expect(sim.isLampLit(2, 0)).toBe(false);
  });
});
