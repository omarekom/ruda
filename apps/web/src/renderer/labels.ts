import type { ReadonlyWorld } from '@ruda/core';
import { MAX_CELL_SIZE, type Camera } from './camera';

/** Zoomed out further than this (pixels per cell), labels are hidden: the text would be too small to read. */
export const MIN_LABEL_CELL_SIZE = 16;
/** The text and its plate always fit in the label's row of cells. */
const FONT_PER_CELL = 0.7;
const PLATE_PER_CELL = 0.86;
export const LABEL_FONT_FAMILY = 'VT323, monospace';
/** Room left and right of the text inside its plate, as a share of the font size. */
export const LABEL_PADDING = 0.3;
const PLATE_COLOR = 'rgba(0, 0, 0, 0.62)';
const TEXT_COLOR = '#fff';
/** Texts drawn once and kept for later frames; beyond this many the cache starts over. */
const MAX_CACHED_TEXTS = 500;

/** Where a label is drawn: the cell it starts in and its plate in screen pixels (CSS). */
export interface LabelBox {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function labelFontPx(cellSize: number): number {
  return cellSize * FONT_PER_CELL;
}

/**
 * The plate of a label starting in cell (x, y) with the given text width: from the cell's left
 * edge, centred on its row. Not rounded to whole pixels, so it scales smoothly while zooming.
 */
export function labelPlate(
  camera: Camera,
  x: number,
  y: number,
  textWidth: number,
): Omit<LabelBox, 'x' | 'y' | 'text'> {
  const { cellSize } = camera;
  const [left, top] = camera.worldToScreen(x, y);
  const height = cellSize * PLATE_PER_CELL;
  return {
    left,
    top: top + (cellSize - height) / 2,
    width: textWidth + 2 * labelFontPx(cellSize) * LABEL_PADDING,
    height,
  };
}

interface Sprite {
  readonly image: HTMLCanvasElement;
  /** Width of the text at the reference font size, in sprite pixels. */
  readonly textWidth: number;
}

/**
 * Each text drawn once, large, and then scaled to every zoom. Drawing the text at each zoom's
 * font size instead makes it jitter while zooming, as glyphs snap to whole pixels differently at
 * every size.
 */
export class LabelSprites {
  private readonly cache = new Map<string, Sprite>();
  /** The font size the sprites are drawn at, in device pixels. */
  private referencePx = 0;

  /** Large enough that the sprites are only ever scaled down. */
  setPixelRatio(ratio: number): void {
    const referencePx = Math.ceil(labelFontPx(MAX_CELL_SIZE) * ratio);
    if (referencePx === this.referencePx) return;
    this.referencePx = referencePx;
    this.cache.clear();
  }

  /** Width of the text at the given font size (CSS px). */
  textWidth(text: string, fontPx: number): number {
    return (this.sprite(text).textWidth * fontPx) / this.referencePx;
  }

  /** Draws the text with its left edge at `left`, centred on `middle` (CSS px). */
  draw(
    g: CanvasRenderingContext2D,
    text: string,
    fontPx: number,
    left: number,
    middle: number,
  ): void {
    const { image } = this.sprite(text);
    const scale = fontPx / this.referencePx;
    const height = image.height * scale;
    g.drawImage(image, left, middle - height / 2, image.width * scale, height);
  }

  /** Forgets the drawn texts, e.g. once the font has loaded. */
  clear(): void {
    this.cache.clear();
  }

  private sprite(text: string): Sprite {
    const cached = this.cache.get(text);
    if (cached) return cached;
    if (this.cache.size >= MAX_CACHED_TEXTS) this.cache.clear();
    const image = document.createElement('canvas');
    const font = `${this.referencePx}px ${LABEL_FONT_FAMILY}`;
    const g = image.getContext('2d');
    if (!g) throw new Error('Canvas 2D is not supported');
    g.font = font;
    const textWidth = g.measureText(text).width;
    image.width = Math.max(1, Math.ceil(textWidth));
    image.height = Math.ceil(this.referencePx * 1.2);
    // Resizing the canvas reset its state.
    g.font = font;
    g.textBaseline = 'middle';
    g.fillStyle = TEXT_COLOR;
    g.fillText(text, 0, image.height / 2);
    const sprite = { image, textWidth };
    this.cache.set(text, sprite);
    return sprite;
  }
}

/**
 * Lays out the labels that reach into the view, top to bottom and left to right, so that a
 * label further down or right is drawn over its neighbours. `skip` leaves out a label being
 * edited. Empty when zoomed out too far.
 */
export function layoutLabels(
  sprites: LabelSprites,
  world: ReadonlyWorld,
  camera: Camera,
  skip: readonly [number, number] | undefined,
): LabelBox[] {
  if (camera.cellSize < MIN_LABEL_CELL_SIZE || world.labelCount === 0) return [];
  const [viewWidth, viewHeight] = camera.viewSize;
  const fontPx = labelFontPx(camera.cellSize);
  const boxes: LabelBox[] = [];
  world.forEachLabel((x, y, text) => {
    if (skip && skip[0] === x && skip[1] === y) return;
    const plate = labelPlate(camera, x, y, sprites.textWidth(text, fontPx));
    const outside =
      plate.left > viewWidth ||
      plate.left + plate.width < 0 ||
      plate.top > viewHeight ||
      plate.top + plate.height < 0;
    if (outside) return;
    boxes.push({ x, y, text, ...plate });
  });
  return boxes.sort((a, b) => a.y - b.y || a.x - b.x);
}

export function drawLabels(
  g: CanvasRenderingContext2D,
  sprites: LabelSprites,
  boxes: readonly LabelBox[],
  cellSize: number,
): void {
  if (boxes.length === 0) return;
  const fontPx = labelFontPx(cellSize);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  for (const box of boxes) {
    g.fillStyle = PLATE_COLOR;
    g.fillRect(box.left, box.top, box.width, box.height);
    sprites.draw(g, box.text, fontPx, box.left + fontPx * LABEL_PADDING, box.top + box.height / 2);
  }
}

/** The label drawn on top at a screen point, if any. */
export function labelAt(
  boxes: readonly LabelBox[],
  sx: number,
  sy: number,
): readonly [number, number] | undefined {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const box = boxes[i];
    if (!box) continue;
    const inside =
      sx >= box.left && sx < box.left + box.width && sy >= box.top && sy < box.top + box.height;
    if (inside) return [box.x, box.y];
  }
  return undefined;
}
