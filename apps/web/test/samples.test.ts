import { Simulation } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { sampleCircuits } from '../src/start/samples';

describe('sampleCircuits', () => {
  it('is settled with three lamps lit and one dark', () => {
    const world = sampleCircuits();
    const simulation = new Simulation(world);
    expect(simulation.runUntilStable(5)).toBeLessThan(5);
    const lamps: boolean[] = [];
    world.forEach((x, y, block) => {
      if (block.type === 'lamp') lamps.push(simulation.isLampLit(x, y));
    });
    expect(lamps.filter(Boolean)).toHaveLength(3);
    expect(lamps).toHaveLength(4);
  });
});
