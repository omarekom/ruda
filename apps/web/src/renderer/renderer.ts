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
import { drawLabels, LABEL_FONT_FAMILY, labelAt, layoutLabels, type LabelBox } from './labels';
import { paintFloor, type CellAppearance, type Skin } from './skins/skin';

const MIN_GRID_CELL_SIZE = 12;
/** Screen pixels (CSS) per pixel of the light buffer. */
const LIGHT_BUFFER_PX = 4;
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
  /** The cell of the label being edited, which the editor shows instead. */
  readonly editingLabel?: readonly [number, number] | undefined;
}

/** Draws the visible part of the world onto a full-window canvas. */
export class Renderer {
  private readonly g: CanvasRenderingContext2D;
  /** What the last frame showed, see frameKey; empty forces the next frame to be drawn. */
  private drawnKey = '';
  /** Where the lights are added up before being blended over the screen, see renderLights. */
  private readonly lightBuffer = document.createElement('canvas');
  /** The labels in the last frame, for finding the one under the cursor. */
  private labelBoxes: LabelBox[] = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private currentSkin: Skin,
  ) {
    // The floor always covers the canvas, so it can be opaque, which is cheaper to composite.
    const g = canvas.getContext('2d', { alpha: false });
    if (!g) throw new Error('Canvas 2D is not supported');
    this.g = g;
    // The canvas does not wait for a web font, so labels are drawn again once it is there.
    void document.fonts.load(`16px ${LABEL_FONT_FAMILY}`).then(() => this.invalidate());
  }

  get skin(): Skin {
    return this.currentSkin;
  }

  /** Can be swapped at any time; the next frame uses the new skin. */
  set skin(skin: Skin) {
    this.currentSkin = skin;
    this.invalidate();
  }

  /** Makes the next drawIfChanged draw, e.g. after the world was edited. */
  invalidate(): void {
    this.drawnKey = '';
  }

  /**
   * Draws a frame unless it would look exactly like the last one, so an idle world costs
   * almost nothing. Anything that changes the picture outside the camera, the ticks and the
   * overlay must call invalidate().
   */
  drawIfChanged(simulation: Simulation, overlay: Overlay, tickProgress: number): void {
    const key = this.frameKey(simulation, overlay, tickProgress);
    if (key === this.drawnKey) return;
    this.drawnKey = key;
    this.draw(simulation, overlay, tickProgress);
  }

  private frameKey(simulation: Simulation, overlay: Overlay, tickProgress: number): string {
    const { camera } = this;
    const [cx, cy] = camera.center;
    const [width, height] = camera.viewSize;
    // Progress only matters while pistons are moving blocks.
    const progress = simulation.recentMoves.length > 0 ? tickProgress : 1;
    const hover = overlay.hover?.join(',') ?? '';
    const ghost = overlay.ghost
      ? `${overlay.ghost.x},${overlay.ghost.y},${JSON.stringify(overlay.ghost.block)}`
      : '';
    const editing = overlay.editingLabel?.join(',') ?? '';
    return `${cx},${cy},${camera.cellSize},${width},${height}|${simulation.tickCount}|${progress}|${hover}|${ghost}|${editing}`;
  }

  /** Matches the backing store to the element size and device pixel ratio. */
  resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width = Math.round(clientWidth * ratio);
    this.canvas.height = Math.round(clientHeight * ratio);
    this.camera.resize(clientWidth, clientHeight);
    this.invalidate();
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
    const lit = lights.length > 0 && this.renderLights(lights);
    // Light pools on the floor, under the blocks.
    if (lit) this.compositeLights(1);

    const shown = this.shownBlocks(simulation, tickProgress);
    const { drawUnder } = this.skin;
    if (drawUnder) {
      for (const cell of shown) {
        this.inCell(cell.x, cell.y, () => drawUnder(g, cell.block, camera.cellSize));
      }
    }
    for (const cell of shown) this.drawCell(cell.x, cell.y, cell.block, cell.appearance, cell.seed);
    // A faint second pass can tint the lit blocks themselves.
    const { strength, overBlocks } = this.skin.glow;
    if (lit && overBlocks > 0) this.compositeLights(overBlocks / strength);

    if (overlay.ghost) {
      const { x, y, block } = overlay.ghost;
      g.globalAlpha = GHOST_ALPHA;
      this.drawCell(x, y, block, ghostAppearance(simulation.blocks, x, y));
      g.globalAlpha = 1;
    }
    this.labelBoxes = layoutLabels(g, simulation.blocks, camera, overlay.editingLabel);
    drawLabels(g, this.labelBoxes, camera.cellSize);
    if (overlay.hover) this.drawHover(...overlay.hover);
  }

  /** The cell of the label shown at a screen point (CSS px), if any. */
  labelAt(sx: number, sy: number): readonly [number, number] | undefined {
    return labelAt(this.labelBoxes, sx, sy);
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

  /**
   * Paints all lights, added up, into the small light buffer; false if it cannot. Light is
   * soft, so a low resolution is enough, and the screen is then blended with the buffer only
   * once instead of once per light.
   */
  private renderLights(lights: readonly Light[]): boolean {
    const { lightBuffer, camera } = this;
    const [width, height] = camera.viewSize;
    const bufferWidth = Math.max(1, Math.ceil(width / LIGHT_BUFFER_PX));
    const bufferHeight = Math.max(1, Math.ceil(height / LIGHT_BUFFER_PX));
    if (lightBuffer.width !== bufferWidth || lightBuffer.height !== bufferHeight) {
      lightBuffer.width = bufferWidth;
      lightBuffer.height = bufferHeight;
    }
    const g = lightBuffer.getContext('2d');
    if (!g) return false;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bufferWidth, bufferHeight);
    g.setTransform(1 / LIGHT_BUFFER_PX, 0, 0, 1 / LIGHT_BUFFER_PX, 0, 0);
    paintLights(
      g,
      lights,
      camera.cellSize,
      (x, y) => camera.worldToScreen(x, y),
      this.skin.glow.strength,
    );
    return true;
  }

  /** Blends the light buffer over the screen in the skin's way, at `opacity`. */
  private compositeLights(opacity: number): void {
    const { g, lightBuffer } = this;
    g.save();
    g.globalCompositeOperation = this.skin.glow.mode;
    g.globalAlpha = Math.min(1, opacity);
    g.imageSmoothingEnabled = true;
    g.drawImage(
      lightBuffer,
      0,
      0,
      lightBuffer.width * LIGHT_BUFFER_PX,
      lightBuffer.height * LIGHT_BUFFER_PX,
    );
    g.restore();
  }

  /**
   * The blocks to draw this frame, in drawing order. Blocks that arrived at their cell this
   * tick slide in instead of standing in place; blocks that left the world (a retracting head)
   * slide away first, beneath the static blocks. Heads come last, as their rods run over the
   * pistons behind them.
   */
  private shownBlocks(simulation: Simulation, tickProgress: number): ShownBlock[] {
    const arrived = new Set<number>();
    for (const move of simulation.recentMoves) {
      const there = simulation.blocks.get(move.toX, move.toY);
      if (there && sameBlock(there, move.block)) arrived.add(cellKey(move.toX, move.toY));
    }
    const progress = easeInOut(tickProgress);
    // How far each piston's head is out right now, by the piston's cell.
    const reaches = new Map<number, number>();
    const moving = (move: BlockMove): ShownBlock => {
      const x = move.fromX + (move.toX - move.fromX) * progress;
      const y = move.fromY + (move.toY - move.fromY) * progress;
      let appearance = appearanceOf(simulation, move.toX, move.toY);
      if (move.block.type === 'piston_head') {
        const extending = arrived.has(cellKey(move.toX, move.toY));
        const [pistonX, pistonY] = extending ? [move.fromX, move.fromY] : [move.toX, move.toY];
        const reach = Math.abs(x - pistonX) + Math.abs(y - pistonY);
        reaches.set(cellKey(pistonX, pistonY), reach);
        appearance = { ...appearance, reach };
      }
      return { x, y, block: move.block, appearance, seed: cellSeed(move.toX, move.toY) };
    };
    const movers = simulation.recentMoves.map((move) => ({
      shown: moving(move),
      arrived: arrived.has(cellKey(move.toX, move.toY)),
    }));

    const shown: ShownBlock[] = [];
    const heads: ShownBlock[] = [];
    const add = (block: ShownBlock): void => {
      (block.block.type === 'piston_head' ? heads : shown).push(block);
    };
    for (const mover of movers) if (!mover.arrived) add(mover.shown);
    const rect = this.camera.visibleCells();
    simulation.blocks.forEachInRect(rect.minX, rect.minY, rect.maxX, rect.maxY, (x, y, block) => {
      const key = cellKey(x, y);
      if (arrived.has(key)) return;
      const reach = reaches.get(key);
      const appearance = appearanceOf(simulation, x, y);
      add({
        x,
        y,
        block,
        appearance: reach === undefined ? appearance : { ...appearance, reach },
        seed: cellSeed(x, y),
      });
    });
    for (const mover of movers) if (mover.arrived) add(mover.shown);
    return [...shown, ...heads];
  }

  /** Runs `draw` with the context moved so the cell's square starts at (0, 0). */
  private inCell(x: number, y: number, draw: () => void): void {
    const [sx, sy] = this.camera.worldToScreen(x, y);
    // Translating back is much cheaper than save() and restore() for every cell.
    this.g.translate(sx, sy);
    draw();
    this.g.translate(-sx, -sy);
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

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
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
