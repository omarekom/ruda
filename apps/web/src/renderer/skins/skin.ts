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
  /** Whether the background is dark; light then adds up, on a light background it tints. */
  readonly dark: boolean;
  /** Colours of the light cast by lit lamps and by powered parts. */
  readonly light: { readonly lamp: string; readonly power: string };
  drawBlock(
    g: CanvasRenderingContext2D,
    block: Block,
    size: number,
    appearance: CellAppearance,
    seed?: number,
  ): void;
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
