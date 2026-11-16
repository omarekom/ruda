import { channelOf, emitsPower, type Block } from './blocks';
import { Axis, cellKey, DIRECTIONS, offset, opposite, type Direction } from './coords';
import type { ReadonlyWorld } from './world';

/** One conducting path through a cell: a wire has one, a crossing has two. */
export interface Channel {
  readonly x: number;
  readonly y: number;
  readonly axis: Axis;
}

/** A connected group of channels that always share one power state. */
export interface Network {
  readonly channels: readonly Channel[];
  powered: boolean;
}

export function channelKey(x: number, y: number, axis: Axis): number {
  return cellKey(x, y) * 2 + axis;
}

export function channelSides(block: Block, axis: Axis): Direction[] {
  return DIRECTIONS.filter((side) => channelOf(block, side) === axis);
}

export function channelsOf(x: number, y: number, block: Block | undefined): Channel[] {
  if (!block) return [];
  const axes = new Set<Axis>();
  for (const side of DIRECTIONS) {
    const axis = channelOf(block, side);
    if (axis !== undefined) axes.add(axis);
  }
  return [...axes].map((axis) => ({ x, y, axis }));
}

/**
 * Tracks which channels form a network. Every channel present in the world belongs
 * to exactly one network; callers dissolve and rebuild the networks an edit touches.
 */
export class Networks {
  private readonly byChannel = new Map<number, Network>();

  constructor(private readonly world: ReadonlyWorld) {}

  get(x: number, y: number, axis: Axis): Network | undefined {
    return this.byChannel.get(channelKey(x, y, axis));
  }

  /** The network entered from a neighbour through the given side of the cell, if any. */
  atSide(x: number, y: number, side: Direction): Network | undefined {
    const block = this.world.get(x, y);
    const axis = block && channelOf(block, side);
    return axis === undefined ? undefined : this.get(x, y, axis);
  }

  /** Removes the networks from the index and returns their channels. */
  dissolve(networks: Iterable<Network>): Channel[] {
    const channels: Channel[] = [];
    for (const network of networks) {
      for (const channel of network.channels) {
        this.byChannel.delete(channelKey(channel.x, channel.y, channel.axis));
        channels.push(channel);
      }
    }
    return channels;
  }

  /** Builds networks for every seed channel that still exists and has no network yet. */
  build(seeds: Iterable<Channel>): Network[] {
    const built: Network[] = [];
    for (const seed of seeds) {
      const block = this.world.get(seed.x, seed.y);
      if (!block || channelSides(block, seed.axis).length === 0) continue;
      if (this.byChannel.has(channelKey(seed.x, seed.y, seed.axis))) continue;
      built.push(this.flood(seed));
    }
    return built;
  }

  /** Recomputes the network's power from its neighbours; returns whether it changed. */
  refresh(network: Network): boolean {
    const powered = network.channels.some((channel) => this.isFed(channel));
    const changed = powered !== network.powered;
    network.powered = powered;
    return changed;
  }

  private flood(seed: Channel): Network {
    const channels: Channel[] = [];
    const network: Network = { channels, powered: false };
    const stack: Channel[] = [seed];
    this.byChannel.set(channelKey(seed.x, seed.y, seed.axis), network);
    for (let channel = stack.pop(); channel; channel = stack.pop()) {
      channels.push(channel);
      for (const next of this.connectedChannels(channel)) {
        const key = channelKey(next.x, next.y, next.axis);
        if (this.byChannel.has(key)) continue;
        this.byChannel.set(key, network);
        stack.push(next);
      }
    }
    this.refresh(network);
    return network;
  }

  private *connectedChannels(channel: Channel): Generator<Channel> {
    for (const side of this.sidesOf(channel)) {
      const [dx, dy] = offset(side);
      const x = channel.x + dx;
      const y = channel.y + dy;
      const neighbour = this.world.get(x, y);
      const axis = neighbour && channelOf(neighbour, opposite(side));
      if (axis !== undefined) yield { x, y, axis };
    }
  }

  private isFed(channel: Channel): boolean {
    return this.sidesOf(channel).some((side) => {
      const [dx, dy] = offset(side);
      const neighbour = this.world.get(channel.x + dx, channel.y + dy);
      return neighbour !== undefined && emitsPower(neighbour, opposite(side));
    });
  }

  private sidesOf(channel: Channel): Direction[] {
    const block = this.world.get(channel.x, channel.y);
    return block ? channelSides(block, channel.axis) : [];
  }
}
