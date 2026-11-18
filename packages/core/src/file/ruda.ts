import { blockFromState, isBlockType, stateOf, type Block } from '../blocks';
import { cellKey, isInWorld } from '../coords';
import { findBrokenPistons } from '../pistons';
import { World, type ReadonlyWorld } from '../world';
import { RudaFileError } from './errors';
import { CURRENT_VERSION, migrate, type JsonObject } from './migrations';

/** The `.ruda` file: blocks grouped by `type[:state…]`, each with flat `x, y` pairs. */
export interface RudaFile {
  readonly rudaversion: number;
  readonly name: string;
  readonly blocks: Readonly<Record<string, readonly number[]>>;
}

export interface LoadedWorld {
  readonly name: string;
  readonly world: World;
}

/** A world read from a damaged file: what could be understood, and what went wrong. */
export interface RepairedWorld extends LoadedWorld {
  readonly problems: readonly string[];
}

/** Called for every defect found; the strict loader throws, the repairing one collects. */
type Report = (message: string) => void;

const STATE_SEPARATOR = ':';

/** Serializes a world as minified JSON. Output is canonical: keys and cells are sorted. */
export function serializeWorld(world: ReadonlyWorld, name: string): string {
  const groups = new Map<string, [number, number][]>();
  world.forEach((x, y, block) => {
    const key = blockKey(block);
    const cells = groups.get(key) ?? [];
    cells.push([x, y]);
    groups.set(key, cells);
  });
  const blocks: Record<string, number[]> = {};
  for (const key of [...groups.keys()].sort()) {
    const cells = groups.get(key) ?? [];
    cells.sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
    blocks[key] = cells.flat();
  }
  const file: RudaFile = { rudaversion: CURRENT_VERSION, name, blocks };
  return JSON.stringify(file);
}

/** Parses a `.ruda` file of any supported version. Throws `RudaFileError` on any defect. */
export function parseWorld(text: string): LoadedWorld {
  return buildWorld(parseJson(text), (message) => {
    throw invalid(message);
  });
}

/**
 * Loads as much of a damaged `.ruda` file as possible, skipping what cannot be understood and
 * listing every defect in `problems`. Still throws when the text is not valid JSON, is not a
 * Ruda world at all, or comes from a newer version.
 */
export function repairWorld(text: string): RepairedWorld {
  const problems: string[] = [];
  const loaded = buildWorld(parseJson(text), (message) => problems.push(message));
  return { ...loaded, problems };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new RudaFileError('invalid_json', 'The file is not valid JSON');
  }
}

function buildWorld(json: unknown, report: Report): LoadedWorld {
  if (!isObject(json)) throw new RudaFileError('not_ruda', 'The file is not a JSON object');
  const file = migrate(json);
  const { name, blocks } = file;
  if (typeof name !== 'string') report('Missing world name');
  if (!isObject(blocks)) report('Missing "blocks" object');

  const world = new World();
  const seen = new Set<number>();
  for (const [key, coordinates] of Object.entries(isObject(blocks) ? blocks : {})) {
    const block = blockFromKey(key);
    if (!block) {
      report(`Unknown block "${key}"`);
      continue;
    }
    if (!Array.isArray(coordinates)) {
      report(`Coordinates of "${key}" must be a flat list of x, y pairs`);
      continue;
    }
    if (coordinates.length % 2 !== 0) {
      report(`Coordinates of "${key}" must be a flat list of x, y pairs`);
    }
    for (let i = 0; i + 1 < coordinates.length; i += 2) {
      const x: unknown = coordinates[i];
      const y: unknown = coordinates[i + 1];
      if (typeof x !== 'number' || typeof y !== 'number' || !isInWorld(x, y)) {
        report(`Invalid cell (${String(x)}, ${String(y)}) for "${key}"`);
        continue;
      }
      const cell = cellKey(x, y);
      if (seen.has(cell)) {
        report(`Cell (${x}, ${y}) appears more than once`);
        continue;
      }
      seen.add(cell);
      world.set(x, y, block);
    }
  }
  for (const { x, y, problem } of findBrokenPistons(world)) {
    report(problem);
    world.set(x, y, undefined);
  }
  return { name: typeof name === 'string' ? name : '', world };
}

function blockKey(block: Block): string {
  return [block.type, ...stateOf(block)].join(STATE_SEPARATOR);
}

function blockFromKey(key: string): Block | undefined {
  const [type, ...state] = key.split(STATE_SEPARATOR);
  return type !== undefined && isBlockType(type) ? blockFromState(type, state) : undefined;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(message: string): RudaFileError {
  return new RudaFileError('invalid_content', message);
}
