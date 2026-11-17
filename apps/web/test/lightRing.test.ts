import { Simulation } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { lightRing } from '../src/start/lightRing';

describe('lightRing', () => {
  it('keeps one lamp at a time lit while the pulse goes round', () => {
    const world = lightRing();
    const lamps: [number, number][] = [];
    world.forEach((x, y, block) => {
      if (block.type === 'lamp') lamps.push([x, y]);
    });
    expect(lamps).toHaveLength(4);

    const simulation = new Simulation(world);
    const everLit = new Set<number>();
    for (let tick = 0; tick < 64; tick++) {
      simulation.step();
      const lit = lamps.flatMap(([x, y], i) => (simulation.isLampLit(x, y) ? [i] : []));
      expect(lit.length).toBeLessThanOrEqual(1);
      lit.forEach((i) => everLit.add(i));
    }
    expect(everLit.size).toBe(4);
  });
});
