import { describe, expect, it } from 'vitest';
import { Axis, createBlock, Direction, Simulation, World, type Command } from '../src';
import { simulationFrom } from './helpers';

describe('Simulation: wires and sources', () => {
  it('lights a lamp through a wire from a power block', () => {
    const sim = simulationFrom('#---o');
    expect(sim.isLampLit(4, 0)).toBe(true);
    expect(sim.isChannelPowered(2, 0, Axis.Horizontal)).toBe(true);
  });

  it('reacts to a lever without delay', () => {
    const sim = simulationFrom('L--o');
    expect(sim.isLampLit(3, 0)).toBe(false);
    expect(sim.execute({ kind: 'interact', x: 0, y: 0 })).toBe(true);
    expect(sim.isLampLit(3, 0)).toBe(true);
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    expect(sim.isLampLit(3, 0)).toBe(false);
  });

  it('powers a lamp directly next to a source', () => {
    expect(simulationFrom('#o').isLampLit(1, 0)).toBe(true);
  });

  it('does not conduct through stone or lamps', () => {
    const sim = simulationFrom('#S-o\n#o-o');
    expect(sim.isLampLit(3, 0)).toBe(false);
    expect(sim.isLampLit(1, 1)).toBe(true);
    expect(sim.isLampLit(3, 1)).toBe(false);
  });

  it('ignores diagonal neighbours', () => {
    expect(simulationFrom('#.\n.o').isLampLit(1, 1)).toBe(false);
  });

  it('splits a network when a wire is removed', () => {
    const sim = simulationFrom('#---o');
    sim.execute({ kind: 'remove', x: 2, y: 0 });
    expect(sim.isLampLit(4, 0)).toBe(false);
    expect(sim.isChannelPowered(1, 0, Axis.Horizontal)).toBe(true);
  });

  it('merges networks when a gap is filled', () => {
    const sim = simulationFrom('#-.-o');
    expect(sim.isLampLit(4, 0)).toBe(false);
    sim.execute({ kind: 'place', x: 2, y: 0, block: createBlock('wire') });
    expect(sim.isLampLit(4, 0)).toBe(true);
  });
});

describe('Simulation: crossing', () => {
  it('keeps the two axes independent', () => {
    const sim = simulationFrom(`
.o.
#+-o
.-.
.o.`);
    expect(sim.isLampLit(3, 1)).toBe(true);
    expect(sim.isLampLit(1, 0)).toBe(false);
    expect(sim.isLampLit(1, 3)).toBe(false);
    expect(sim.isChannelPowered(1, 1, Axis.Horizontal)).toBe(true);
    expect(sim.isChannelPowered(1, 1, Axis.Vertical)).toBe(false);
  });

  it('chains crossings along an axis', () => {
    expect(simulationFrom('#++-o').isLampLit(4, 0)).toBe(true);
  });
});

describe('Simulation: torch', () => {
  it('turns on one tick after being placed with no input', () => {
    const sim = simulationFrom('.>o');
    expect(sim.isLampLit(2, 0)).toBe(false);
    sim.step();
    expect(sim.isLampLit(2, 0)).toBe(true);
    expect(sim.isStable).toBe(true);
  });

  it('inverts its back input with a one-tick delay', () => {
    const sim = simulationFrom('L->-o');
    sim.step();
    expect(sim.isLampLit(4, 0)).toBe(true);
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    expect(sim.isLampLit(4, 0)).toBe(true);
    sim.step();
    expect(sim.isLampLit(4, 0)).toBe(false);
  });

  it('ignores power from its sides and front', () => {
    const sim = simulationFrom(`
.#.
.>o
.#.`);
    sim.step();
    expect(sim.isLampLit(2, 1)).toBe(true);
    const fromFront = simulationFrom('#<.');
    fromFront.step();
    expect(fromFront.blocks.get(1, 0)).toMatchObject({ lit: true });
  });

  it('powers only the cell in front of it', () => {
    const sim = simulationFrom(`
.o.
o>o
.o.`);
    sim.step();
    expect(sim.isLampLit(2, 1)).toBe(true);
    expect(sim.isLampLit(1, 0)).toBe(false);
    expect(sim.isLampLit(1, 2)).toBe(false);
    expect(sim.isLampLit(0, 1)).toBe(false);
  });

  it('adds one tick per torch in a chain', () => {
    const sim = simulationFrom('L>>>o');
    sim.runUntilStable(10);
    expect(sim.isLampLit(4, 0)).toBe(true);
    sim.execute({ kind: 'interact', x: 0, y: 0 });
    const ticks = sim.runUntilStable(10);
    expect(ticks).toBe(3);
    expect(sim.isLampLit(4, 0)).toBe(false);
  });

  it('oscillates every tick when wired back into itself', () => {
    const sim = simulationFrom(`
.>-
---`);
    sim.execute({ kind: 'place', x: 0, y: 0, block: createBlock('wire') });
    const states: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      sim.step();
      states.push(sim.isChannelPowered(2, 0, Axis.Horizontal));
    }
    expect(states).toEqual([true, false, true, false, true, false]);
    expect(sim.isStable).toBe(false);
  });

  it('turns off when its input is placed after it', () => {
    const sim = simulationFrom('..>o');
    sim.step();
    sim.execute({ kind: 'place', x: 1, y: 0, block: { type: 'power_block' } });
    sim.step();
    expect(sim.isLampLit(3, 0)).toBe(false);
    sim.execute({ kind: 'remove', x: 1, y: 0 });
    sim.step();
    expect(sim.isLampLit(3, 0)).toBe(true);
  });
});

describe('Simulation: commands', () => {
  it('refuses to place into an occupied cell or outside the world', () => {
    const sim = simulationFrom('S');
    expect(sim.execute({ kind: 'place', x: 0, y: 0, block: createBlock('wire') })).toBe(false);
    expect(sim.blocks.get(0, 0)).toEqual({ type: 'stone' });
    expect(sim.execute({ kind: 'place', x: 40000, y: 0, block: createBlock('wire') })).toBe(false);
  });

  it('only interacts with interactive blocks and only removes existing blocks', () => {
    const sim = simulationFrom('S');
    expect(sim.execute({ kind: 'interact', x: 0, y: 0 })).toBe(false);
    expect(sim.execute({ kind: 'remove', x: 1, y: 0 })).toBe(false);
  });
});

describe('Simulation: determinism and loading', () => {
  it('produces identical worlds from identical command sequences', () => {
    const commands: Command[] = [
      { kind: 'place', x: 0, y: 0, block: createBlock('torch', Direction.East) },
      { kind: 'place', x: 1, y: 0, block: createBlock('wire') },
      { kind: 'place', x: 1, y: 1, block: createBlock('torch', Direction.West) },
      { kind: 'place', x: 0, y: 1, block: createBlock('wire') },
      { kind: 'place', x: -1, y: 1, block: createBlock('wire') },
      { kind: 'place', x: -1, y: 0, block: createBlock('wire') },
    ];
    const snapshot = () => {
      const sim = new Simulation();
      commands.forEach((command, i) => {
        sim.execute(command);
        sim.step(i);
      });
      sim.step(7);
      const cells: string[] = [];
      sim.blocks.forEach((x, y, block) => cells.push(`${x},${y}:${JSON.stringify(block)}`));
      return cells.sort();
    };
    expect(snapshot()).toEqual(snapshot());
  });

  it('derives power for a world built outside the simulation', () => {
    const world = new World();
    world.set(0, 0, { type: 'power_block' });
    world.set(1, 0, { type: 'wire' });
    world.set(2, 0, { type: 'torch', facing: Direction.East, lit: true });
    world.set(3, 0, { type: 'lamp' });
    const sim = new Simulation(world);
    expect(sim.isChannelPowered(1, 0, Axis.Horizontal)).toBe(true);
    expect(sim.isLampLit(3, 0)).toBe(true);
    sim.step();
    expect(sim.isLampLit(3, 0)).toBe(false);
  });
});
