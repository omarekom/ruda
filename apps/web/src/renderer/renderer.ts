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
  WORLD_MAX,
  WORLD_MIN,
} from '@ruda/core';
import type { Camera } from './camera';
import {
  lightOf,
  MAX_LIGHT_RADIUS,
  MIN_LIGHT_CELL_SIZE,
  paintLights,
  type Light,
} from './lighting';
import { paintFloor, type CellAppearance, type Skin } from './skins/skin';

const MIN_GRID_CELL_SIZE = 12;
const GHOST_ALPHA = 0.5;

interface ShownBlock {
  readonly x: number;
  readonly y: number;
  readonly block: Block;
  readonly appearance: CellAppearance;
  readonly seed: number;
}

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
    /** Can be swapped at any time; the next frame uses the new skin. */
    public skin: Skin,
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
    const { clientWidth, clientHeight } = this.canvas;
    const origin = camera.worldToScreen(0, 0);
    paintFloor(g, this.skin, camera.cellSize, origin, clientWidth, clientHeight);

    if (camera.cellSize >= MIN_GRID_CELL_SIZE) this.drawGrid();

    const lights = camera.cellSize >= MIN_LIGHT_CELL_SIZE ? this.collectLights(simulation) : [];
    // Light pools on the floor, under the blocks.
    this.paintLights(lights, this.skin.glow.strength);

    const shown = this.shownBlocks(simulation, tickProgress);
    const { drawUnder } = this.skin;
    if (drawUnder) {
      for (const cell of shown) {
        this.inCell(cell.x, cell.y, () => drawUnder(g, cell.block, camera.cellSize));
      }
    }
    for (const cell of shown) this.drawCell(cell.x, cell.y, cell.block, cell.appearance, cell.seed);
    // A faint second pass can tint the lit blocks themselves.
    if (this.skin.glow.overBlocks > 0) this.paintLights(lights, this.skin.glow.overBlocks);

    if (overlay.ghost) {
      const { x, y, block } = overlay.ghost;
      g.globalAlpha = GHOST_ALPHA;
      this.drawCell(x, y, block, ghostAppearance(simulation.blocks, x, y));
      g.globalAlpha = 1;
    }
    if (overlay.hover) this.drawHover(...overlay.hover);
  }

  /** Lights from blocks on screen and from those close enough for their glow to reach it. */
  private collectLights(simulation: Simulation): Light[] {
    const rect = this.camera.visibleCells();
    const margin = Math.ceil(MAX_LIGHT_RADIUS);
    const lights: Light[] = [];
    simulation.blocks.forEachInRect(
      Math.max(WORLD_MIN, rect.minX - margin),
      Math.max(WORLD_MIN, rect.minY - margin),
      Math.min(WORLD_MAX - 1, rect.maxX + margin),
      Math.min(WORLD_MAX - 1, rect.maxY + margin),
      (x, y, block) => {
        const light = lightOf(x, y, block, simulation, this.skin);
        if (light) lights.push(light);
      },
    );
    return lights;
  }

  private paintLights(lights: readonly Light[], strength: number): void {
    paintLights(
      this.g,
      lights,
      this.camera.cellSize,
      (x, y) => this.camera.worldToScreen(x, y),
      this.skin.glow.mode,
      strength,
    );
  }

  /**
   * The blocks to draw this frame, in drawing order. Blocks that arrived at their cell this
   * tick slide in instead of standing in place; blocks that left the world (a retracting head)
   * slide away first, beneath the static blocks.
   */
  private shownBlocks(simulation: Simulation, tickProgress: number): ShownBlock[] {
    const arrived = new Set<number>();
    const vanished: BlockMove[] = [];
    for (const move of simulation.recentMoves) {
      const there = simulation.blocks.get(move.toX, move.toY);
      if (there && sameBlock(there, move.block)) arrived.add(cellKey(move.toX, move.toY));
      else vanished.push(move);
    }
    const progress = easeOut(tickProgress);
    const moving = (move: BlockMove): ShownBlock => ({
      x: move.fromX + (move.toX - move.fromX) * progress,
      y: move.fromY + (move.toY - move.fromY) * progress,
      block: move.block,
      appearance: appearanceOf(simulation, move.toX, move.toY),
      seed: cellSeed(move.toX, move.toY),
    });

    const shown = vanished.map(moving);
    const rect = this.camera.visibleCells();
    simulation.blocks.forEachInRect(rect.minX, rect.minY, rect.maxX, rect.maxY, (x, y, block) => {
      if (arrived.has(cellKey(x, y))) return;
      shown.push({ x, y, block, appearance: appearanceOf(simulation, x, y), seed: cellSeed(x, y) });
    });
    for (const move of simulation.recentMoves) {
      if (arrived.has(cellKey(move.toX, move.toY))) shown.push(moving(move));
    }
    return shown;
  }

  /** Runs `draw` with the context moved so the cell's square starts at (0, 0). */
  private inCell(x: number, y: number, draw: () => void): void {
    const [sx, sy] = this.camera.worldToScreen(x, y);
    this.g.save();
    this.g.translate(sx, sy);
    draw();
    this.g.restore();
  }

  private drawCell(
    x: number,
    y: number,
    block: Block,
    appearance: CellAppearance,
    seed = cellSeed(x, y),
  ): void {
    this.inCell(x, y, () =>
      this.skin.drawBlock(this.g, block, this.camera.cellSize, appearance, seed),
    );
  }

  private drawGrid(): void {
    const { g, camera } = this;
    const rect = camera.visibleCells();
    g.strokeStyle = this.skin.grid;
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
    this.g.strokeStyle = this.skin.hover;
    this.g.lineWidth = 2;
    this.g.strokeRect(sx + 1, sy + 1, size - 2, size - 2);
  }
}

/** A per-cell number that stays the same between frames. */
export function cellSeed(x: number, y: number): number {
  return Math.imul(x, 73856093) ^ Math.imul(y, 19349663);
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** How the cell looks given the simulation's current power state. */
export function appearanceOf(simulation: Simulation, x: number, y: number): CellAppearance {
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
