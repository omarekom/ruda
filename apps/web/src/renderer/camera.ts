import { WORLD_MAX, WORLD_MIN } from '@ruda/core';

export const MIN_CELL_SIZE = 4;
export const MAX_CELL_SIZE = 96;

export interface CellRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Maps between screen pixels (CSS px) and world cell coordinates. */
export class Camera {
  /** World point shown at the centre of the screen, in cells. */
  private centerX = 0.5;
  private centerY = 0.5;
  private size = 32;
  private width = 0;
  private height = 0;

  /** Pixels per cell. */
  get cellSize(): number {
    return this.size;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    return [
      this.centerX + (sx - this.width / 2) / this.size,
      this.centerY + (sy - this.height / 2) / this.size,
    ];
  }

  worldToScreen(wx: number, wy: number): [number, number] {
    return [
      (wx - this.centerX) * this.size + this.width / 2,
      (wy - this.centerY) * this.size + this.height / 2,
    ];
  }

  cellAt(sx: number, sy: number): [number, number] {
    const [wx, wy] = this.screenToWorld(sx, sy);
    return [Math.floor(wx), Math.floor(wy)];
  }

  /** Moves the view by a screen-space distance. */
  panBy(dx: number, dy: number): void {
    this.centerX = clamp(this.centerX + dx / this.size, WORLD_MIN, WORLD_MAX);
    this.centerY = clamp(this.centerY + dy / this.size, WORLD_MIN, WORLD_MAX);
  }

  /** Zooms by a factor while keeping the world point under (sx, sy) in place. */
  zoomAt(sx: number, sy: number, factor: number): void {
    const [beforeX, beforeY] = this.screenToWorld(sx, sy);
    this.size = clamp(this.size * factor, MIN_CELL_SIZE, MAX_CELL_SIZE);
    const [afterX, afterY] = this.screenToWorld(sx, sy);
    this.panBy((beforeX - afterX) * this.size, (beforeY - afterY) * this.size);
  }

  /** Cells at least partly visible, clamped to the world. */
  visibleCells(): CellRect {
    const [left, top] = this.screenToWorld(0, 0);
    const [right, bottom] = this.screenToWorld(this.width, this.height);
    return {
      minX: Math.max(WORLD_MIN, Math.floor(left)),
      minY: Math.max(WORLD_MIN, Math.floor(top)),
      maxX: Math.min(WORLD_MAX - 1, Math.floor(right)),
      maxY: Math.min(WORLD_MAX - 1, Math.floor(bottom)),
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
