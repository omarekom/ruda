import { describe, expect, it } from 'vitest';
import {
  createBlock,
  Direction,
  MAX_PUSH,
  parseWorld,
  RudaFileError,
  serializeWorld,
  Simulation,
  WORLD_MAX,
} from '../src';
import { simulationFrom } from './helpers';

const types = (sim: Simulation, y: number, width: number) =>
  Array.from({ length: width }, (_, x) => sim.blocks.get(x, y)?.type ?? '.');

describe('Piston', () => {
  it('extends one tick after being powered, pushing the block in front', () => {
    const sim = simulationFrom('LpS');
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    expect(types(sim, 0, 4)).toEqual(['lever', 'piston', 'stone', '.']);
    sim.step();
    expect(types(sim, 0, 4)).toEqual(['lever', 'piston', 'piston_head', 'stone']);
    expect(sim.blocks.get(1, 0)).toMatchObject({ extended: true });
    expect(sim.recentMoves.map((m) => [m.block.type, m.fromX, m.toX])).toEqual([
      ['stone', 2, 3],
      ['piston_head', 1, 2],
    ]);
  });

  it('retracts when power stops, leaving pushed blocks in place', () => {
    const sim = simulationFrom('LpS');
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step();
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step();
    expect(types(sim, 0, 4)).toEqual(['lever', 'piston', '.', 'stone']);
    expect(sim.blocks.get(1, 0)).toMatchObject({ extended: false });
  });

  it('is powered from its sides but not from its front', () => {
    const fromFront = simulationFrom('p#');
    fromFront.step(2);
    expect(fromFront.blocks.get(0, 0)).toMatchObject({ extended: false });
    const fromSide = simulationFrom('#\np');
    fromSide.step();
    expect(fromSide.blocks.get(0, 1)).toMatchObject({ extended: true });
  });

  it(`pushes up to ${MAX_PUSH} blocks`, () => {
    const sim = simulationFrom('Lp' + 'S'.repeat(MAX_PUSH));
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step();
    expect(sim.blocks.get(1, 0)).toMatchObject({ extended: true });
    expect(sim.blocks.get(MAX_PUSH + 2, 0)?.type).toBe('stone');
  });

  it('does not move a longer chain, and moves once the chain gets short enough', () => {
    const sim = simulationFrom('Lp' + 'S'.repeat(MAX_PUSH + 1));
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step(3);
    expect(sim.blocks.get(1, 0)).toMatchObject({ extended: false });
    sim.execute({ kind: 'remove', x: MAX_PUSH + 2, y: 0 });
    sim.step();
    expect(sim.blocks.get(1, 0)).toMatchObject({ extended: true });
  });

  it('cannot push past the world edge', () => {
    const sim = new Simulation();
    const x = WORLD_MAX - 3;
    sim.execute({ kind: 'place', x, y: 0, block: createBlock('piston', Direction.East) });
    sim.execute({ kind: 'place', x: x + 1, y: 0, block: createBlock('stone') });
    sim.execute({ kind: 'place', x: x + 2, y: 0, block: createBlock('stone') });
    sim.execute({ kind: 'place', x: x - 1, y: 0, block: createBlock('power_block') });
    sim.step();
    expect(sim.blocks.get(x, 0)).toMatchObject({ extended: false });
  });

  it('pushes solid blocks, updating power', () => {
    const sim = simulationFrom('Lp#o.o');
    expect(sim.isLampLit(5, 0)).toBe(false);
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step();
    expect(types(sim, 0, 6)).toEqual([
      'lever',
      'piston',
      'piston_head',
      'power_block',
      'lamp',
      'lamp',
    ]);
    expect(sim.isLampLit(4, 0)).toBe(true);
  });

  it.each([
    ['wire', '-'],
    ['crossing', '+'],
    ['lever', 'L'],
    ['button', 'B'],
    ['torch', '^'],
    ['delayer', ')'],
  ])('is blocked by a %s, anywhere in the chain', (_name, char) => {
    for (const map of [`Lp${char}`, `LpS${char}S`]) {
      const sim = simulationFrom(map);
      sim.execute({ kind: 'interact', x: 0, y: 0 });
      sim.step(2);
      expect(sim.blocks.get(1, 0)).toMatchObject({ extended: false });
    }
  });

  it('moves neither piston when two push into the same cell', () => {
    const sim = simulationFrom('#.#\np.q');
    sim.step(2);
    expect(sim.blocks.get(0, 1)).toMatchObject({ extended: false });
    expect(sim.blocks.get(2, 1)).toMatchObject({ extended: false });
    expect(sim.blocks.get(1, 1)).toBeUndefined();
  });

  it('moves neither piston when each would push the other', () => {
    const sim = simulationFrom('#..#\n.pq.');
    sim.execute({ kind: 'place', x: 0, y: 1, block: createBlock('lever') });
    sim.execute({ kind: 'interact', x: 0, y: 1 });
    sim.execute({ kind: 'place', x: 3, y: 1, block: { type: 'lever', on: true } });
    sim.step(2);
    expect(sim.blocks.get(1, 1)).toMatchObject({ extended: false });
    expect(sim.blocks.get(2, 1)).toMatchObject({ extended: false });
  });

  it('cannot push an extended piston', () => {
    const sim = simulationFrom('Lpp\n..#');
    sim.step();
    expect(sim.blocks.get(2, 0)).toMatchObject({ extended: true });
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step(2);
    expect(sim.blocks.get(1, 0)).toMatchObject({ extended: false });
    expect(sim.blocks.get(3, 0)?.type).toBe('piston_head');
  });

  it('pushes a retracted piston like any block', () => {
    const sim = simulationFrom('Lpp');
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    sim.step();
    expect(types(sim, 0, 4)).toEqual(['lever', 'piston', 'piston_head', 'piston']);
  });

  it('removes both halves together and refuses to place a lone head or extended piston', () => {
    const sim = simulationFrom('#p');
    sim.step();
    expect(sim.execute({ kind: 'remove', x: 2, y: 0 })).toBe(true);
    expect(types(sim, 0, 3)).toEqual(['power_block', '.', '.']);
    const head = { type: 'piston_head', facing: Direction.East } as const;
    expect(sim.execute({ kind: 'place', x: 5, y: 5, block: head })).toBe(false);
    const extended = { type: 'piston', facing: Direction.East, extended: true } as const;
    expect(sim.execute({ kind: 'place', x: 5, y: 5, block: extended })).toBe(false);
  });

  it('saves and loads an extended piston', () => {
    const sim = simulationFrom('#pS');
    sim.step();
    const text = serializeWorld(sim.blocks, 'p');
    expect(text).toContain('"piston:east:extended":[1,0],"piston_head:east":[2,0]');
    expect(serializeWorld(parseWorld(text).world, 'p')).toBe(text);
  });

  it('rejects files with half a piston', () => {
    const load = (blocks: string) => () =>
      parseWorld(`{"rudaversion":1,"name":"x","blocks":${blocks}}`);
    expect(load('{"piston:east:extended":[0,0]}')).toThrow(RudaFileError);
    expect(load('{"piston_head:east":[0,0]}')).toThrow(RudaFileError);
    expect(load('{"piston:east:extended":[0,0],"piston_head:west":[1,0]}')).toThrow(RudaFileError);
  });
});
