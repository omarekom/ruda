export const TICKS_PER_SECOND = 10;
const TICK_MS = 1000 / TICKS_PER_SECOND;
/** Limits catch-up after a slow frame (per unit of speed) so the page never stalls. */
const MAX_TICKS_PER_FRAME = 3;

/**
 * Drives fixed-rate ticks and per-frame rendering from requestAnimationFrame.
 * While the page is hidden, time does not accumulate, so no missed ticks are replayed.
 */
export class TickLoop {
  /** While paused, frames are still drawn but no ticks run. */
  paused = false;
  /** Ticks per second as a multiple of TICKS_PER_SECOND. */
  speed = 1;
  private frame: number | undefined;
  private last = 0;
  private accumulated = 0;

  constructor(
    private readonly onTick: () => void,
    /** `tickProgress` is the fraction of the current tick that has elapsed, in [0, 1]. */
    private readonly onFrame: (dtMs: number, tickProgress: number) => void,
  ) {}

  start(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  /** Runs the ticks due after `dtMs` of real time and returns the current tick progress. */
  advance(dtMs: number): number {
    if (this.paused) {
      this.accumulated = 0;
      // Show the last tick as finished, e.g. pushed blocks at their destination.
      return 1;
    }
    const limit = TICK_MS * MAX_TICKS_PER_FRAME * this.speed;
    this.accumulated = Math.min(this.accumulated + dtMs * this.speed, limit);
    while (this.accumulated >= TICK_MS) {
      this.onTick();
      this.accumulated -= TICK_MS;
    }
    return this.accumulated / TICK_MS;
  }

  private readonly loop = (now: number): void => {
    const dt = now - this.last;
    this.last = now;
    this.onFrame(dt, this.advance(dt));
    this.frame = requestAnimationFrame(this.loop);
  };

  private readonly onVisibilityChange = (): void => {
    this.last = performance.now();
    this.accumulated = 0;
  };
}
