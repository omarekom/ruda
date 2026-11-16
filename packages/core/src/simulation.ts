import {
  emitsPower,
  hasDelay,
  inputsOf,
  interactWith,
  sameBlock,
  tickBlock,
  type Block,
} from './blocks';
import type { Command } from './commands';
import {
  Axis,
  cellFromKey,
  cellKey,
  DIRECTIONS,
  isInWorld,
  offset,
  opposite,
  type Direction,
} from './coords';
import {
  channelKey,
  channelSides,
  channelsOf,
  Networks,
  type Channel,
  type Network,
} from './networks';
import { World, type ReadonlyWorld } from './world';

/**
 * Owns a world and advances it in discrete ticks. Commands are applied between ticks and
 * zero-delay parts settle immediately; blocks with a delay (torch, delayer, button) change
 * on ticks. Only those whose next tick may differ are evaluated.
 */
export class Simulation {
  private readonly world: World;
  private readonly networks: Networks;
  private readonly pending = new Set<number>();
  private ticks = 0;

  constructor(world: World = new World()) {
    this.world = world;
    this.networks = new Networks(world);
    const channels: Channel[] = [];
    world.forEach((x, y, block) => {
      channels.push(...channelsOf(x, y, block));
      if (hasDelay(block)) this.pending.add(cellKey(x, y));
    });
    this.networks.build(channels);
  }

  get blocks(): ReadonlyWorld {
    return this.world;
  }

  get tickCount(): number {
    return this.ticks;
  }

  /** True when further ticks would change nothing. */
  get isStable(): boolean {
    return this.pending.size === 0;
  }

  /** Applies a command; returns false if it was not applicable and changed nothing. */
  execute(command: Command): boolean {
    const { x, y } = command;
    if (!isInWorld(x, y)) return false;
    const current = this.world.get(x, y);
    switch (command.kind) {
      case 'place':
        if (current) return false;
        this.edit(x, y, command.block);
        return true;
      case 'remove':
        if (!current) return false;
        this.edit(x, y, undefined);
        return true;
      case 'interact': {
        const next = current && interactWith(current);
        if (!next) return false;
        this.edit(x, y, next);
        return true;
      }
    }
  }

  step(ticks = 1): void {
    for (let i = 0; i < ticks; i++) this.tick();
  }

  /** Steps until stable or until `maxTicks` have run; returns the number of ticks run. */
  runUntilStable(maxTicks: number): number {
    let run = 0;
    while (!this.isStable && run < maxTicks) {
      this.tick();
      run++;
    }
    return run;
  }

  isChannelPowered(x: number, y: number, axis: Axis): boolean {
    return this.networks.get(x, y, axis)?.powered ?? false;
  }

  /** Whether the neighbour on the given side sends power into the cell. */
  receivesPower(x: number, y: number, side: Direction): boolean {
    const [dx, dy] = offset(side);
    const nx = x + dx;
    const ny = y + dy;
    const neighbour = this.world.get(nx, ny);
    if (!neighbour) return false;
    const towardCell = opposite(side);
    return (
      emitsPower(neighbour, towardCell) ||
      (this.networks.atSide(nx, ny, towardCell)?.powered ?? false)
    );
  }

  isLampLit(x: number, y: number): boolean {
    return (
      this.world.get(x, y)?.type === 'lamp' &&
      DIRECTIONS.some((side) => this.receivesPower(x, y, side))
    );
  }

  private tick(): void {
    // Every block reads the settled state of the previous tick before any of them changes.
    const changes: [number, number, Block, Block][] = [];
    for (const key of this.pending) {
      const [x, y] = cellFromKey(key);
      const block = this.world.get(x, y);
      const next = block && tickBlock(block, (side) => this.receivesPower(x, y, side));
      if (block && next && !sameBlock(block, next)) changes.push([x, y, block, next]);
    }
    this.pending.clear();

    const touched = new Set<Network>();
    for (const [x, y, before, after] of changes) {
      this.world.set(x, y, after);
      for (const side of DIRECTIONS) {
        if (emitsPower(before, side) === emitsPower(after, side)) continue;
        const [dx, dy] = offset(side);
        const network = this.networks.atSide(x + dx, y + dy, opposite(side));
        if (network) touched.add(network);
        this.markIfReads(x + dx, y + dy, opposite(side));
      }
    }
    for (const network of touched) {
      if (this.networks.refresh(network)) this.markReadersAround(network.channels);
    }
    // A block that would change again with unchanged inputs (a delay line still shifting,
    // a button counting down) stays scheduled.
    for (const [x, y, , after] of changes) {
      const next = tickBlock(after, (side) => this.receivesPower(x, y, side));
      if (next && !sameBlock(after, next)) this.pending.add(cellKey(x, y));
    }
    this.ticks++;
  }

  /** Replaces a cell and rebuilds every network the cell touches. */
  private edit(x: number, y: number, block: Block | undefined): void {
    const affected = new Set<Network>();
    for (const channel of channelsOf(x, y, this.world.get(x, y))) {
      const network = this.networks.get(channel.x, channel.y, channel.axis);
      if (network) affected.add(network);
    }
    for (const side of DIRECTIONS) {
      const [dx, dy] = offset(side);
      const network = this.networks.atSide(x + dx, y + dy, opposite(side));
      if (network) affected.add(network);
    }

    const wasPowered = new Map<number, boolean>();
    for (const network of affected) {
      for (const c of network.channels)
        wasPowered.set(channelKey(c.x, c.y, c.axis), network.powered);
    }
    const seeds = this.networks.dissolve(affected);

    this.world.set(x, y, block);
    seeds.push(...channelsOf(x, y, block));
    for (const network of this.networks.build(seeds)) {
      const changed = network.channels.filter(
        (c) => (wasPowered.get(channelKey(c.x, c.y, c.axis)) ?? false) !== network.powered,
      );
      this.markReadersAround(changed);
    }

    if (block && hasDelay(block)) this.pending.add(cellKey(x, y));
    for (const side of DIRECTIONS) {
      const [dx, dy] = offset(side);
      this.markIfReads(x + dx, y + dy, opposite(side));
    }
  }

  private markReadersAround(channels: readonly Channel[]): void {
    for (const channel of channels) {
      const block = this.world.get(channel.x, channel.y);
      if (!block) continue;
      for (const side of channelSides(block, channel.axis)) {
        const [dx, dy] = offset(side);
        this.markIfReads(channel.x + dx, channel.y + dy, opposite(side));
      }
    }
  }

  /** Schedules the block at (x, y) if it reads power from the given side. */
  private markIfReads(x: number, y: number, side: Direction): void {
    const block = this.world.get(x, y);
    if (block && inputsOf(block).includes(side)) this.pending.add(cellKey(x, y));
  }
}
