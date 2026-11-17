import { Simulation } from '@ruda/core';
import type { BuiltCreation, Creation } from '../src';

/** Drives a built creation by its named points. */
export class Bench {
  readonly simulation: Simulation;
  private readonly built: BuiltCreation;

  constructor(creation: Creation) {
    this.built = creation.build();
    this.simulation = new Simulation(this.built.world);
  }

  point(name: string): readonly [number, number] {
    const point = this.built.points.get(name);
    if (!point) throw new Error(`No point "${name}"`);
    return point;
  }

  setLever(name: string, on: boolean): void {
    const [x, y] = this.point(name);
    const block = this.simulation.blocks.get(x, y);
    if (block?.type !== 'lever') throw new Error(`"${name}" is not a lever`);
    if (block.on !== on) this.simulation.execute({ kind: 'interact', x, y });
  }

  press(name: string): void {
    const [x, y] = this.point(name);
    if (!this.simulation.execute({ kind: 'interact', x, y }))
      throw new Error(`Cannot press "${name}"`);
  }

  lit(name: string): boolean {
    return this.simulation.isLampLit(...this.point(name));
  }

  settle(): void {
    this.simulation.runUntilStable(200);
    if (!this.simulation.isStable) throw new Error('Circuit did not settle');
  }

  /** Lamp state after each of the next `ticks` ticks, as 0 / 1. */
  trace(name: string, ticks: number): number[] {
    const states: number[] = [];
    for (let i = 0; i < ticks; i++) {
      this.simulation.step();
      states.push(this.lit(name) ? 1 : 0);
    }
    return states;
  }
}

/** All combinations of `count` booleans, as arrays. */
export function combinations(count: number): boolean[][] {
  return Array.from({ length: 2 ** count }, (_, n) =>
    Array.from({ length: count }, (_, bit) => ((n >> bit) & 1) === 1),
  );
}
