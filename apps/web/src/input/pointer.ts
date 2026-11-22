import { Direction, isRotatable, type Command } from '@ruda/core';
import { heldBlock, selectedType, type HotbarState } from '../game/hotbar';
import type { Camera } from '../renderer/camera';
import type { Overlay } from '../renderer/renderer';

const LEFT = 0;
const MIDDLE = 1;
const RIGHT = 2;
const EDGE_MARGIN_PX = 16;
const WHEEL_ZOOM_SPEED = 0.0015;
/** How far (in cells) the pointer must leave the cell centre before a drag sets the facing. */
const ROTATE_DRAG_CELLS = 0.5;

/** What the primary and secondary actions do to the world. */
export interface PointerActions {
  /** Applies a command; false if it changed nothing. */
  readonly execute: (command: Command) => boolean;
  readonly isInteractiveAt: (x: number, y: number) => boolean;
  /** Breaks whatever is under the screen point (CSS px on the canvas). */
  readonly destroyAt: (sx: number, sy: number) => void;
}

/**
 * Mouse controls on the world canvas: the left button places (dragging sets the facing) or
 * interacts with a block (lever, button, delayer), the right button breaks, the middle button
 * pans, the wheel zooms. The keyboard aliases (Space, Delete) click at the cursor.
 */
export class PointerInput {
  private cursor: [number, number] | undefined;
  private placing: { readonly x: number; readonly y: number } | undefined;
  private panning = false;
  /**
   * The span (left, right in canvas pixels) of the bottom edge that does not scroll, because
   * the hotbar is there and the cursor often slips past it.
   */
  bottomEdgeGap: readonly [number, number] | undefined;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
    private readonly hotbar: HotbarState,
    private readonly actions: PointerActions,
  ) {}

  attach(): void {
    const { canvas } = this;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', preventDefault);
    canvas.addEventListener('auxclick', preventDefault);
  }

  detach(): void {
    const { canvas } = this;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('contextmenu', preventDefault);
    canvas.removeEventListener('auxclick', preventDefault);
    // Nothing is known about the cursor until it moves over the canvas again.
    this.cursor = undefined;
    this.placing = undefined;
    this.panning = false;
  }

  /** Where the cursor is on the canvas (CSS px), if it is over it. */
  get cursorPosition(): readonly [number, number] | undefined {
    return this.cursor;
  }

  overlay(): Overlay {
    const ghost = this.placing && { ...this.placing, block: heldBlock(this.hotbar) };
    return { hover: this.cursor && this.camera.cellAt(...this.cursor), ghost };
  }

  /**
   * Pan direction from the cursor touching a screen edge. The cursor is unknown while it
   * is outside the canvas (over the hotbar or outside the window), so nothing scrolls then.
   */
  edgeScrollDirection(): [number, number] {
    if (!this.cursor || this.panning) return [0, 0];
    const { clientWidth, clientHeight } = this.canvas;
    return edgeScroll(this.cursor, clientWidth, clientHeight, this.bottomEdgeGap);
  }

  /**
   * Starts the primary action at the cursor: interacts with a block that can be used, or
   * shows the ghost of the held block, which is placed on `endPrimary`.
   */
  private beginPrimary(): void {
    if (!this.cursor) return;
    const [x, y] = this.camera.cellAt(...this.cursor);
    if (this.actions.isInteractiveAt(x, y)) this.actions.execute({ kind: 'interact', x, y });
    else this.placing = { x, y };
  }

  /** Places the block whose ghost `beginPrimary` showed. */
  private endPrimary(): void {
    if (!this.placing) return;
    this.actions.execute({ kind: 'place', ...this.placing, block: heldBlock(this.hotbar) });
    this.placing = undefined;
  }

  /** The primary action at the cursor as one click: uses the block there or places the held one. */
  primaryClick(): void {
    if (this.placing) return;
    this.beginPrimary();
    this.endPrimary();
  }

  /** The secondary action at the cursor: breaks what is there. */
  secondary(): void {
    if (this.cursor) this.actions.destroyAt(...this.cursor);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.cursor = [event.offsetX, event.offsetY];
    if (event.button === LEFT) {
      this.beginPrimary();
    } else if (event.button === RIGHT) {
      this.secondary();
    } else if (event.button === MIDDLE) {
      event.preventDefault();
      this.panning = true;
    } else {
      return;
    }
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const previous = this.cursor;
    this.cursor = [event.offsetX, event.offsetY];
    if (this.panning && previous) {
      this.camera.panBy(previous[0] - event.offsetX, previous[1] - event.offsetY);
    }
    if (this.placing) this.rotateTowardCursor(this.placing.x, this.placing.y);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.button === LEFT) {
      this.endPrimary();
    } else if (event.button === MIDDLE) {
      this.panning = false;
    }
  };

  private readonly onPointerLeave = (): void => {
    this.cursor = undefined;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.camera.zoomAt(event.offsetX, event.offsetY, Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED));
  };

  private rotateTowardCursor(x: number, y: number): void {
    if (!this.cursor || !isRotatable(selectedType(this.hotbar))) return;
    const [centerX, centerY] = this.camera.worldToScreen(x + 0.5, y + 0.5);
    const dx = this.cursor[0] - centerX;
    const dy = this.cursor[1] - centerY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.camera.cellSize * ROTATE_DRAG_CELLS) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.hotbar.facing = dx > 0 ? Direction.East : Direction.West;
    } else {
      this.hotbar.facing = dy > 0 ? Direction.South : Direction.North;
    }
  }
}

function edge(position: number, length: number): number {
  if (position < EDGE_MARGIN_PX) return -1;
  if (position > length - EDGE_MARGIN_PX) return 1;
  return 0;
}

/**
 * Pan direction for a cursor at `cursor` on a canvas of the given size: towards each screen
 * edge it touches, except along `bottomGap` of the bottom edge.
 */
export function edgeScroll(
  [x, y]: readonly [number, number],
  width: number,
  height: number,
  bottomGap: readonly [number, number] | undefined,
): [number, number] {
  const vertical = edge(y, height);
  const inGap = bottomGap !== undefined && x >= bottomGap[0] && x <= bottomGap[1];
  return [edge(x, width), vertical === 1 && inGap ? 0 : vertical];
}

function preventDefault(event: Event): void {
  event.preventDefault();
}
