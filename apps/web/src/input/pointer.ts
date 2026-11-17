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

/**
 * Mouse controls on the world canvas: right button places (dragging sets the facing) or
 * interacts with a block (lever, button, delayer), left button removes, middle button pans,
 * wheel zooms.
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
    private readonly execute: (command: Command) => boolean,
    private readonly isInteractiveAt: (x: number, y: number) => boolean,
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

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.cursor = [event.offsetX, event.offsetY];
    const [x, y] = this.camera.cellAt(event.offsetX, event.offsetY);
    if (event.button === LEFT) {
      this.execute({ kind: 'remove', x, y });
    } else if (event.button === RIGHT) {
      if (this.isInteractiveAt(x, y)) this.execute({ kind: 'interact', x, y });
      else this.placing = { x, y };
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
    if (event.button === RIGHT && this.placing) {
      this.execute({ kind: 'place', ...this.placing, block: heldBlock(this.hotbar) });
      this.placing = undefined;
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
