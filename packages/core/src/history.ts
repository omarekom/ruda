import { MAX_DELAY, MIN_DELAY, type Block, type BlockType } from './blocks';
import type { Command } from './commands';
import { pistonPartner } from './pistons';
import type { Simulation } from './simulation';
import type { ReadonlyWorld } from './world';

/** How many edits can be undone. */
export const HISTORY_LIMIT = 100;

/** A cell that must hold a block of the given type (or be empty) for a step to apply. */
interface Guard {
  readonly x: number;
  readonly y: number;
  readonly expected: BlockType | undefined;
}

/**
 * Commands that take the world one way through an edit. The world keeps running between
 * edits (pistons move blocks), so a block step only applies while its cell still holds the
 * block type the edit left there. Labels never move, so their steps have no guard.
 */
interface Step {
  readonly commands: readonly Command[];
  readonly guard: Guard | undefined;
}

interface Entry {
  readonly undo: Step;
  readonly redo: Step;
}

/**
 * Runs player commands on a simulation and remembers how to reverse them. Undo and redo are
 * commands too, so they work the same way over the network. An edit that the running world
 * has since made impossible to reverse is dropped and the next one is tried instead.
 */
export class History {
  private readonly done: Entry[] = [];
  private undone: Entry[] = [];
  private forgotten = false;

  constructor(
    private readonly simulation: Simulation,
    private readonly limit = HISTORY_LIMIT,
  ) {}

  /** Applies a command; returns false if it changed nothing. */
  execute(command: Command): boolean {
    const entry = entryFor(this.simulation.blocks, command);
    if (!this.simulation.execute(command)) return false;
    // Pressing a button cannot be taken back; it leaves the history as it was.
    if (!entry) return true;
    this.done.push(entry);
    if (this.done.length > this.limit) {
      this.done.shift();
      this.forgotten = true;
    }
    this.undone = [];
    return true;
  }

  /** Whether older edits were dropped to stay within the limit, so undo cannot reach them. */
  get hasForgotten(): boolean {
    return this.forgotten;
  }

  /** Reverses the latest edit that can still be reversed; false if there is none. */
  undo(): boolean {
    for (let entry = this.done.pop(); entry; entry = this.done.pop()) {
      if (this.apply(entry.undo)) {
        this.undone.push(entry);
        return true;
      }
    }
    return false;
  }

  /** Repeats the latest undone edit that can still be repeated; false if there is none. */
  redo(): boolean {
    for (let entry = this.undone.pop(); entry; entry = this.undone.pop()) {
      if (this.apply(entry.redo)) {
        this.done.push(entry);
        return true;
      }
    }
    return false;
  }

  private apply({ commands, guard }: Step): boolean {
    if (guard && this.simulation.blocks.get(guard.x, guard.y)?.type !== guard.expected) {
      return false;
    }
    const [first, ...rest] = commands;
    if (!first || !this.simulation.execute(first)) return false;
    for (const command of rest) this.simulation.execute(command);
    return true;
  }
}

/** How to undo and redo the command in the world as it is before the command runs. */
function entryFor(world: ReadonlyWorld, command: Command): Entry | undefined {
  const { x, y } = command;
  const current = world.get(x, y);
  switch (command.kind) {
    case 'place':
      return {
        undo: {
          commands: [{ kind: 'remove', x, y }],
          guard: { x, y, expected: command.block.type },
        },
        redo: { commands: [command], guard: { x, y, expected: undefined } },
      };
    case 'remove':
      return current && removalEntry(world, x, y, current);
    case 'interact':
      return current && interactionEntry(command, current);
    case 'label': {
      const undo: Command = { kind: 'label', x, y, text: world.label(x, y) ?? '' };
      return {
        undo: { commands: [undo], guard: undefined },
        redo: { commands: [command], guard: undefined },
      };
    }
  }
}

/** Removing a piston takes both halves; undoing it brings the piston back retracted. */
function removalEntry(world: ReadonlyWorld, x: number, y: number, removed: Block): Entry {
  const [px, py] = removed.type === 'piston_head' ? (pistonPartner(world, x, y) ?? [x, y]) : [x, y];
  const restored: Block =
    removed.type === 'piston_head'
      ? { type: 'piston', facing: removed.facing, extended: false }
      : removed.type === 'piston'
        ? { ...removed, extended: false }
        : removed;
  return {
    undo: {
      commands: [{ kind: 'place', x: px, y: py, block: restored }],
      guard: { x: px, y: py, expected: undefined },
    },
    redo: {
      commands: [{ kind: 'remove', x: px, y: py }],
      guard: { x: px, y: py, expected: restored.type },
    },
  };
}

function interactionEntry(command: Command, block: Block): Entry | undefined {
  const { x, y } = command;
  const redo: Step = { commands: [command], guard: { x, y, expected: block.type } };
  switch (block.type) {
    case 'lever':
      return { undo: redo, redo };
    case 'delayer':
      // The delay cycles through every value, so the remaining cycles lead back to it.
      return {
        undo: { ...redo, commands: new Array<Command>(MAX_DELAY - MIN_DELAY).fill(command) },
        redo,
      };
    default:
      return undefined;
  }
}
