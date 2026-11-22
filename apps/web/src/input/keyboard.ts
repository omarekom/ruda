import { rotateHeld, selectSlot, slotForKey, type HotbarState } from '../game/hotbar';

const PAN_KEYS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/** How much one press of a zoom key zooms in (or, inverted, out). */
const ZOOM_STEP = 1.25;

/** Whether the key is a plus (1) or minus (-1) key; digit keys stay hotbar slots whatever they type. */
function zoomDirection(event: KeyboardEvent): number {
  if (event.code === 'NumpadAdd' || event.code === 'Equal') return 1;
  if (event.code === 'NumpadSubtract' || event.code === 'Minus') return -1;
  if (event.code.startsWith('Digit')) return 0;
  return event.key === '+' ? 1 : event.key === '-' ? -1 : 0;
}

/** What the game does for keys that stand in for the mouse or act on the view. */
export interface KeyboardActions {
  readonly zoomBy: (factor: number) => void;
  /** Space, like the left mouse button: pressed, then released. */
  readonly beginPrimary: () => void;
  readonly endPrimary: () => void;
  /** Delete, like the right mouse button. */
  readonly secondary: () => void;
  /** T: writes or edits the label at the cursor. */
  readonly editLabel: () => void;
}

/**
 * Tracks held pan keys and handles hotbar shortcuts (0–9, R), the zoom keys (+, −), the
 * mouse button aliases (Space, Delete) and the label key (T).
 */
export class KeyboardInput {
  private readonly pressed = new Set<string>();

  constructor(
    private readonly hotbar: HotbarState,
    private readonly actions: KeyboardActions,
  ) {}

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.pressed.clear();
  }

  /** Sum of held pan directions, each component in [-1, 1]. */
  panDirection(): [number, number] {
    let x = 0;
    let y = 0;
    for (const code of this.pressed) {
      const [dx, dy] = PAN_KEYS[code] ?? [0, 0];
      x += dx;
      y += dy;
    }
    return [Math.sign(x), Math.sign(y)];
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space') {
      // Also keeps Space from pressing a focused button, such as the last hotbar slot clicked.
      event.preventDefault();
      if (!event.repeat) this.actions.beginPrimary();
      return;
    }
    if (event.code === 'Delete') {
      if (!event.repeat) this.actions.secondary();
      return;
    }
    if (event.code === 'KeyT') {
      // The label editor takes the focus now, and the T itself must not be typed into it.
      event.preventDefault();
      if (!event.repeat) this.actions.editLabel();
      return;
    }
    if (event.code in PAN_KEYS) {
      this.pressed.add(event.code);
      event.preventDefault();
      return;
    }
    const zoom = zoomDirection(event);
    if (zoom !== 0) {
      this.actions.zoomBy(ZOOM_STEP ** zoom);
      event.preventDefault();
      return;
    }
    const digit = /^Digit([0-9])$/.exec(event.code)?.[1];
    if (digit) selectSlot(this.hotbar, slotForKey(Number(digit)));
    else if (event.code === 'KeyR' && !event.repeat) rotateHeld(this.hotbar);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
    if (event.code === 'Space') {
      // A focused button would be pressed by Space on its release.
      event.preventDefault();
      this.actions.endPrimary();
    }
  };

  private readonly onBlur = (): void => {
    this.pressed.clear();
  };
}
