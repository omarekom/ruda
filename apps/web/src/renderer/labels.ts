import type { ReadonlyWorld } from '@ruda/core';
import type { Camera } from './camera';

/** Zoomed out further than this (pixels per cell), labels are hidden so they do not bury the circuit. */
export const MIN_LABEL_CELL_SIZE = 10;
/** The smallest text that still reads well in the pixel font, in CSS px. */
const MIN_FONT_PX = 20;
/** Zoomed in, the text grows with the cells. */
const FONT_PER_CELL = 0.7;
export const LABEL_FONT_FAMILY = 'VT323, monospace';
/** Room around the text inside its plate, as a share of the font size. */
const PADDING_X = 0.3;
const PLATE_HEIGHT = 1.1;
const PLATE_COLOR = 'rgba(0, 0, 0, 0.62)';
const TEXT_COLOR = '#fff';

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
  return Math.round(Math.max(MIN_FONT_PX, cellSize * FONT_PER_CELL));
}

export function labelFont(cellSize: number): string {
  return `${labelFontPx(cellSize)}px ${LABEL_FONT_FAMILY}`;
}

/**
 * The plate of a label starting in cell (x, y) with the given text width: from the cell's left
 * edge, centred on its row.
 */
export function labelPlate(
  camera: Camera,
  x: number,
  y: number,
  textWidth: number,
): Omit<LabelBox, 'x' | 'y' | 'text'> {
  const fontPx = labelFontPx(camera.cellSize);
  const [left, top] = camera.worldToScreen(x, y);
  const height = Math.round(fontPx * PLATE_HEIGHT);
  return {
    left: Math.round(left),
    top: Math.round(top + camera.cellSize / 2 - height / 2),
    width: Math.ceil(textWidth + 2 * fontPx * PADDING_X),
    height,
  };
}

/**
 * Lays out the labels that reach into the view, top to bottom and left to right, so that a
 * label further down or right is drawn over its neighbours. `skip` leaves out a label being
 * edited. Empty when zoomed out too far.
 */
export function layoutLabels(
  g: CanvasRenderingContext2D,
  world: ReadonlyWorld,
  camera: Camera,
  skip: readonly [number, number] | undefined,
): LabelBox[] {
  if (camera.cellSize < MIN_LABEL_CELL_SIZE || world.labelCount === 0) return [];
  const [viewWidth, viewHeight] = camera.viewSize;
  g.font = labelFont(camera.cellSize);
  const boxes: LabelBox[] = [];
  world.forEachLabel((x, y, text) => {
    if (skip && skip[0] === x && skip[1] === y) return;
    const plate = labelPlate(camera, x, y, g.measureText(text).width);
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
  boxes: readonly LabelBox[],
  cellSize: number,
): void {
  if (boxes.length === 0) return;
  const fontPx = labelFontPx(cellSize);
  g.font = labelFont(cellSize);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  for (const box of boxes) {
    g.fillStyle = PLATE_COLOR;
    g.fillRect(box.left, box.top, box.width, box.height);
    g.fillStyle = TEXT_COLOR;
    g.fillText(box.text, box.left + fontPx * PADDING_X, box.top + box.height / 2);
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
