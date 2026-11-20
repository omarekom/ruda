import { describe, expect, it } from 'vitest';
import { createBlock, Direction, History, Simulation } from '../src';
import { simulationFrom } from './helpers';

const stone = createBlock('stone');

function delayOf(sim: Simulation, x: number, y: number): number | undefined {
  const block = sim.blocks.get(x, y);
  return block?.type === 'delayer' ? block.line.length : undefined;
}

describe('History', () => {
  it('undoes and redoes placing a block', () => {
    const sim = new Simulation();
    const history = new History(sim);
    history.execute({ kind: 'place', x: 1, y: 2, block: stone });
    expect(history.undo()).toBe(true);
    expect(sim.blocks.get(1, 2)).toBeUndefined();
    expect(history.redo()).toBe(true);
    expect(sim.blocks.get(1, 2)).toEqual(stone);
  });

  it('restores a removed block with its state', () => {
    const sim = simulationFrom('l');
    const history = new History(sim);
    history.execute({ kind: 'remove', x: 0, y: 0 });
    history.undo();
    expect(sim.blocks.get(0, 0)).toEqual({ type: 'lever', on: true });
  });

  it('undoes edits in reverse order', () => {
    const sim = new Simulation();
    const history = new History(sim);
    history.execute({ kind: 'place', x: 0, y: 0, block: stone });
    history.execute({ kind: 'place', x: 1, y: 0, block: stone });
    history.undo();
    expect(sim.blocks.get(0, 0)).toBeDefined();
    expect(sim.blocks.get(1, 0)).toBeUndefined();
  });

  it('flips a lever back', () => {
    const sim = simulationFrom('L-o');
    const history = new History(sim);
    history.execute({ kind: 'interact', x: 0, y: 0 });
    expect(sim.isLampLit(2, 0)).toBe(true);
    history.undo();
    expect(sim.isLampLit(2, 0)).toBe(false);
    history.redo();
    expect(sim.isLampLit(2, 0)).toBe(true);
  });

  it('returns a delayer to its previous delay', () => {
    const sim = simulationFrom(')');
    const history = new History(sim);
    history.execute({ kind: 'interact', x: 0, y: 0 });
    expect(delayOf(sim, 0, 0)).toBe(2);
    history.undo();
    expect(delayOf(sim, 0, 0)).toBe(1);
    history.redo();
    expect(delayOf(sim, 0, 0)).toBe(2);
  });

  it('does not record button presses', () => {
    const sim = new Simulation();
    const history = new History(sim);
    history.execute({ kind: 'place', x: 0, y: 0, block: createBlock('button') });
    expect(history.execute({ kind: 'interact', x: 0, y: 0 })).toBe(true);
    expect(history.undo()).toBe(true);
    expect(sim.blocks.get(0, 0)).toBeUndefined();
  });

  it('does not record commands that changed nothing', () => {
    const sim = simulationFrom('S');
    const history = new History(sim);
    expect(history.execute({ kind: 'place', x: 0, y: 0, block: stone })).toBe(false);
    expect(history.undo()).toBe(false);
  });

  it('brings back a removed extended piston retracted, from either half', () => {
    for (const removedX of [1, 2]) {
      const sim = simulationFrom('lp');
      const history = new History(sim);
      sim.step();
      history.execute({ kind: 'remove', x: removedX, y: 0 });
      expect(sim.blocks.get(1, 0)).toBeUndefined();
      expect(sim.blocks.get(2, 0)).toBeUndefined();
      history.undo();
      expect(sim.blocks.get(1, 0)).toEqual({
        type: 'piston',
        facing: Direction.East,
        extended: false,
      });
      expect(sim.blocks.get(2, 0)).toBeUndefined();
      history.redo();
      expect(sim.blocks.get(1, 0)).toBeUndefined();
    }
  });

  it('skips edits the running world has made impossible to undo', () => {
    const sim = simulationFrom('Lp');
    const history = new History(sim);
    history.execute({ kind: 'place', x: 5, y: 0, block: stone });
    history.execute({ kind: 'place', x: 2, y: 0, block: stone });
    history.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step();
    // The piston pushed the stone from x 2 to x 3. Undo first turns the lever off again,
    // then cannot remove the moved stone and removes the one at x 5 instead.
    history.undo();
    sim.step();
    expect(history.undo()).toBe(true);
    expect(sim.blocks.get(3, 0)).toEqual(stone);
    expect(sim.blocks.get(5, 0)).toBeUndefined();
  });

  it('forgets undone edits after a new edit', () => {
    const sim = new Simulation();
    const history = new History(sim);
    history.execute({ kind: 'place', x: 0, y: 0, block: stone });
    history.undo();
    history.execute({ kind: 'place', x: 1, y: 0, block: stone });
    expect(history.redo()).toBe(false);
    expect(sim.blocks.get(0, 0)).toBeUndefined();
  });

  it('keeps only the most recent edits', () => {
    const sim = new Simulation();
    const history = new History(sim, 2);
    for (let x = 0; x < 3; x++) history.execute({ kind: 'place', x, y: 0, block: stone });
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(false);
    expect(sim.blocks.get(0, 0)).toEqual(stone);
  });

  it('tells when older edits were dropped', () => {
    const history = new History(new Simulation(), 2);
    for (let x = 0; x < 2; x++) history.execute({ kind: 'place', x, y: 0, block: stone });
    expect(history.hasForgotten).toBe(false);
    history.execute({ kind: 'place', x: 2, y: 0, block: stone });
    expect(history.hasForgotten).toBe(true);
  });
});
