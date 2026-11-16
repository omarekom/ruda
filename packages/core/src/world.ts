import type { Block } from './blocks';
import { isInWorld } from './coords';

export const CHUNK_SIZE = 32;
const CHUNK_AREA = CHUNK_SIZE * CHUNK_SIZE;
// Chunk coordinates lie in [-1000, 1000); biasing by 1024 keeps keys non-negative.
const CHUNK_BIAS = 1024;
const CHUNK_SPAN = 2048;

interface Chunk {
  readonly cx: number;
  readonly cy: number;
  readonly cells: (Block | undefined)[];
  count: number;
}

export type BlockVisitor = (x: number, y: number, block: Block) => void;

export interface ReadonlyWorld {
  get(x: number, y: number): Block | undefined;
  readonly blockCount: number;
  /** Visits every block in the inclusive rectangle. */
  forEachInRect(minX: number, minY: number, maxX: number, maxY: number, visit: BlockVisitor): void;
  forEach(visit: BlockVisitor): void;
}

/** A sparse grid of blocks; a chunk exists only while it holds at least one block. */
export class World implements ReadonlyWorld {
  private readonly chunks = new Map<number, Chunk>();
  private count = 0;

  get blockCount(): number {
    return this.count;
  }

  get(x: number, y: number): Block | undefined {
    if (!isInWorld(x, y)) return undefined;
    return this.chunks.get(chunkKey(chunkCoord(x), chunkCoord(y)))?.cells[localIndex(x, y)];
  }

  /** Sets or clears a cell. Coordinates outside the world are an error. */
  set(x: number, y: number, block: Block | undefined): void {
    if (!isInWorld(x, y)) throw new RangeError(`Cell (${x}, ${y}) is outside the world`);
    const cx = chunkCoord(x);
    const cy = chunkCoord(y);
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      if (!block) return;
      chunk = { cx, cy, cells: new Array<Block | undefined>(CHUNK_AREA), count: 0 };
      this.chunks.set(key, chunk);
    }
    const index = localIndex(x, y);
    const delta = (block ? 1 : 0) - (chunk.cells[index] ? 1 : 0);
    chunk.cells[index] = block;
    chunk.count += delta;
    this.count += delta;
    if (chunk.count === 0) this.chunks.delete(key);
  }

  forEachInRect(minX: number, minY: number, maxX: number, maxY: number, visit: BlockVisitor): void {
    const minCx = chunkCoord(Math.floor(minX));
    const maxCx = chunkCoord(Math.floor(maxX));
    const minCy = chunkCoord(Math.floor(minY));
    const maxCy = chunkCoord(Math.floor(maxY));
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const chunk = this.chunks.get(chunkKey(cx, cy));
        if (chunk) visitChunk(chunk, minX, minY, maxX, maxY, visit);
      }
    }
  }

  forEach(visit: BlockVisitor): void {
    for (const chunk of this.chunks.values()) {
      visitChunk(chunk, -Infinity, -Infinity, Infinity, Infinity, visit);
    }
  }
}

function visitChunk(
  chunk: Chunk,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  visit: BlockVisitor,
): void {
  const originX = chunk.cx * CHUNK_SIZE;
  const originY = chunk.cy * CHUNK_SIZE;
  chunk.cells.forEach((block, index) => {
    if (!block) return;
    const x = originX + (index % CHUNK_SIZE);
    const y = originY + Math.floor(index / CHUNK_SIZE);
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) visit(x, y, block);
  });
}

function chunkCoord(cell: number): number {
  return Math.floor(cell / CHUNK_SIZE);
}

function chunkKey(cx: number, cy: number): number {
  return (cx + CHUNK_BIAS) * CHUNK_SPAN + (cy + CHUNK_BIAS);
}

function localIndex(x: number, y: number): number {
  const lx = x - chunkCoord(x) * CHUNK_SIZE;
  const ly = y - chunkCoord(y) * CHUNK_SIZE;
  return ly * CHUNK_SIZE + lx;
}
