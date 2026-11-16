import {
  Axis,
  cellKey,
  DIRECTIONS,
  sameBlock,
  wireAttaches,
  type Block,
  type BlockMove,
  type ReadonlyWorld,
  type Simulation,
} from '@ruda/core';
import type { Camera } from './camera';
import { drawBlock, type CellAppearance } from './looks';

const BACKGROUND = '#1d1f24';
const GRID = 'rgba(255, 255, 255, 0.05)';
const HOVER = 'rgba(255, 255, 255, 0.45)';
const MIN_GRID_CELL_SIZE = 12;
const GHOST_ALPHA = 0.5;

export interface Overlay {
  readonly hover: readonly [number, number] | undefined;
  readonly ghost: { readonly x: number; readonly y: number; readonly block: Block } | undefined;
}

/** Draws the visible part of the world onto a full-window canvas. */
export class Renderer {
  private readonly g: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
  ) {
    const g = canvas.getContext('2d');
    if (!g) throw new Error('Canvas 2D is not supported');
    this.g = g;
  }

  /** Matches the backing store to the element size and device pixel ratio. */
  resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width = Math.round(clientWidth * ratio);
    this.canvas.height = Math.round(clientHeight * ratio);
    this.camera.resize(clientWidth, clientHeight);
  }

  /** `tickProgress` (0–1) animates the blocks pistons moved during the last tick. */
  draw(simulation: Simulation, overlay: Overlay, tickProgress: number): void {
    const { g, camera } = this;
    const ratio = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.fillStyle = BACKGROUND;
    g.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

    if (camera.cellSize >= MIN_GRID_CELL_SIZE) this.drawGrid();

    // Blocks that arrived at their cell this tick are drawn sliding in instead of in place.
    // Blocks that left the world (a retracting head) slide away beneath the static blocks.
    const arrived = new Set<number>();
    const vanished: BlockMove[] = [];
    for (const move of simulation.recentMoves) {
      const there = simulation.blocks.get(move.toX, move.toY);
      if (there && sameBlock(there, move.block)) arrived.add(cellKey(move.toX, move.toY));
      else vanished.push(move);
    }
    const progress = easeOut(tickProgress);
    for (const move of vanished) this.drawMoving(simulation, move, progress);

    const rect = camera.visibleCells();
    simulation.blocks.forEachInRect(rect.minX, rect.minY, rect.maxX, rect.maxY, (x, y, block) => {
      if (!arrived.has(cellKey(x, y))) this.drawCell(x, y, block, appearanceOf(simulation, x, y));
    });
    for (const move of simulation.recentMoves) {
      if (arrived.has(cellKey(move.toX, move.toY))) this.drawMoving(simulation, move, progress);
    }

    if (overlay.ghost) {
      const { x, y, block } = overlay.ghost;
      g.globalAlpha = GHOST_ALPHA;
      this.drawCell(x, y, block, ghostAppearance(simulation.blocks, x, y));
      g.globalAlpha = 1;
    }
    if (overlay.hover) this.drawHover(...overlay.hover);
  }

  private drawMoving(simulation: Simulation, move: BlockMove, progress: number): void {
    const x = move.fromX + (move.toX - move.fromX) * progress;
    const y = move.fromY + (move.toY - move.fromY) * progress;
    this.drawCell(x, y, move.block, appearanceOf(simulation, move.toX, move.toY));
  }

  private drawCell(x: number, y: number, block: Block, appearance: CellAppearance): void {
    const [sx, sy] = this.camera.worldToScreen(x, y);
    this.g.save();
    this.g.translate(sx, sy);
    drawBlock(this.g, block, this.camera.cellSize, appearance);
    this.g.restore();
  }

  private drawGrid(): void {
    const { g, camera } = this;
    const rect = camera.visibleCells();
    g.strokeStyle = GRID;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = rect.minX; x <= rect.maxX + 1; x++) {
      const [sx] = camera.worldToScreen(x, 0);
      g.moveTo(Math.round(sx) + 0.5, 0);
      g.lineTo(Math.round(sx) + 0.5, this.canvas.clientHeight);
    }
    for (let y = rect.minY; y <= rect.maxY + 1; y++) {
      const [, sy] = camera.worldToScreen(0, y);
      g.moveTo(0, Math.round(sy) + 0.5);
      g.lineTo(this.canvas.clientWidth, Math.round(sy) + 0.5);
    }
    g.stroke();
  }

  private drawHover(x: number, y: number): void {
    const [sx, sy] = this.camera.worldToScreen(x, y);
    const size = this.camera.cellSize;
    this.g.strokeStyle = HOVER;
    this.g.lineWidth = 2;
    this.g.strokeRect(sx + 1, sy + 1, size - 2, size - 2);
  }
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function appearanceOf(simulation: Simulation, x: number, y: number): CellAppearance {
  return {
    attached: DIRECTIONS.map((side) => wireAttaches(simulation.blocks, x, y, side)),
    powered: [
      simulation.isChannelPowered(x, y, Axis.Horizontal),
      simulation.isChannelPowered(x, y, Axis.Vertical),
    ],
    lit: simulation.isLampLit(x, y),
  };
}

function ghostAppearance(world: ReadonlyWorld, x: number, y: number): CellAppearance {
  return {
    attached: DIRECTIONS.map((side) => wireAttaches(world, x, y, side)),
    powered: [false, false],
    lit: false,
  };
}
