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

/** Tracks held pan keys and handles hotbar shortcuts (0–9, R). */
export class KeyboardInput {
  private readonly pressed = new Set<string>();

  constructor(private readonly hotbar: HotbarState) {}

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
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
    if (event.code in PAN_KEYS) {
      this.pressed.add(event.code);
      event.preventDefault();
      return;
    }
    const digit = /^Digit([0-9])$/.exec(event.code)?.[1];
    if (digit) selectSlot(this.hotbar, slotForKey(Number(digit)));
    else if (event.code === 'KeyR' && !event.repeat) rotateHeld(this.hotbar);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.pressed.clear();
  };
}
