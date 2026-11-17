import type { Block, BlockOf, BlockType } from '@ruda/core';

/** Everything about a cell's surroundings and power that affects how it is drawn. */
export interface CellAppearance {
  /** Wire attachments, indexed by Direction. */
  readonly attached: readonly boolean[];
  /** Channel power, indexed by Axis. */
  readonly powered: readonly boolean[];
  readonly lit: boolean;
}

/** How a block looks on its own, e.g. in the hotbar. */
export const ISOLATED: CellAppearance = {
  attached: [false, true, false, true],
  powered: [true, true],
  lit: true,
};

/**
 * Draws a block into the square (0, 0)–(size, size) of the context. `seed` differs per cell,
 * so hand-drawn skins can wobble differently in every cell yet stay stable between frames.
 */
export type Look<T extends BlockType> = (
  g: CanvasRenderingContext2D,
  block: BlockOf<T>,
  size: number,
  appearance: CellAppearance,
  seed: number,
) => void;

export type LookTable = { readonly [T in BlockType]: Look<T> };

/** A complete visual style for the world: colours of the canvas plus a look for every block. */
export interface Skin {
  readonly background: string;
  readonly grid: string;
  readonly hover: string;
  /** A neutral foreground colour, e.g. for inert blocks on the minimap. */
  readonly ink: string;
  /**
   * How the light is blended in. It is painted on the floor under the blocks with `strength`,
   * then once more over them with `overBlocks` (0 for none). Light adds up on dark skins
   * ('lighter'); light skins tint or overlay.
   */
  readonly glow: {
    readonly mode: GlobalCompositeOperation;
    readonly strength: number;
    readonly overBlocks: number;
  };
  /** Colours of the light cast by lit lamps and by powered parts. */
  readonly light: { readonly lamp: string; readonly power: string };
  drawBlock(
    g: CanvasRenderingContext2D,
    block: Block,
    size: number,
    appearance: CellAppearance,
    seed?: number,
  ): void;
  /**
   * Paints the ground instead of the plain background colour. `origin` is where the world's
   * cell (0, 0) is on screen, so a texture can stay aligned with the cells.
   */
  drawFloor?(
    g: CanvasRenderingContext2D,
    cellSize: number,
    origin: readonly [number, number],
    width: number,
    height: number,
  ): void;
  /**
   * Drawn for every block before any block itself, in the same cell square, for things that
   * may fall onto neighbouring cells but must stay under their blocks, such as shadows.
   */
  drawUnder?(g: CanvasRenderingContext2D, block: Block, size: number): void;
}

/** Dispatches a block to its look in the table. */
export function drawFromTable(
  looks: LookTable,
  g: CanvasRenderingContext2D,
  block: Block,
  size: number,
  appearance: CellAppearance,
  seed = 0,
): void {
  // The table pairs each type with its own look; TypeScript cannot correlate the union here.
  const look = looks[block.type] as Look<BlockType>;
  look(g, block, size, appearance, seed);
}

/** Paints the skin's floor, or its plain background where it has none. */
export function paintFloor(
  g: CanvasRenderingContext2D,
  skin: Skin,
  cellSize: number,
  origin: readonly [number, number],
  width: number,
  height: number,
): void {
  if (skin.drawFloor) {
    skin.drawFloor(g, cellSize, origin, width, height);
  } else {
    g.fillStyle = skin.background;
    g.fillRect(0, 0, width, height);
  }
}
