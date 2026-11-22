import {
  History,
  isInteractive,
  type Command,
  type ReadonlyWorld,
  type Simulation,
} from '@ruda/core';
import { KeyboardInput } from '../input/keyboard';
import { PointerInput } from '../input/pointer';
import { Camera } from '../renderer/camera';
import { crossfade } from '../renderer/crossfade';
import { Renderer } from '../renderer/renderer';
import type { PowerState } from '../renderer/lighting';
import type { Skin } from '../renderer/skins/skin';
import type { HotbarState } from './hotbar';
import { TickLoop } from './tickLoop';

const PAN_SPEED_PX_PER_S = 700;

/** Wires the simulation to the canvas: real-time ticks, rendering and input. */
export class Game {
  readonly camera = new Camera();
  private readonly renderer: Renderer;
  private readonly keyboard: KeyboardInput;
  private readonly pointer: PointerInput;
  private readonly loop: TickLoop;
  private readonly resizeObserver: ResizeObserver;
  /** Kept for as long as the world is open; saving does not clear it. */
  private readonly history: History;
  private inputAttached = false;

  /** `onEdit` runs after every command that changed the world. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    hotbar: HotbarState,
    private readonly simulation: Simulation,
    private readonly onEdit: () => void,
    skin: Skin,
  ) {
    this.renderer = new Renderer(canvas, this.camera, skin);
    this.history = new History(simulation);
    this.pointer = new PointerInput(canvas, this.camera, hotbar, {
      execute: (command) => this.execute(command),
      isInteractiveAt: (x, y) => {
        const block = this.simulation.blocks.get(x, y);
        return block !== undefined && isInteractive(block);
      },
      destroyAt: (sx, sy) => {
        const [x, y] = this.camera.cellAt(sx, sy);
        this.execute({ kind: 'remove', x, y });
      },
    });
    this.keyboard = new KeyboardInput(hotbar, {
      zoomBy: (factor) => {
        const [width, height] = this.camera.viewSize;
        this.camera.zoomAt(width / 2, height / 2, factor);
      },
      beginPrimary: () => this.pointer.beginPrimary(),
      endPrimary: () => this.pointer.endPrimary(),
      secondary: () => this.pointer.secondary(),
    });
    this.loop = new TickLoop(
      () => this.simulation.step(),
      (dt, tickProgress) => this.frame(dt, tickProgress),
    );
    this.resizeObserver = new ResizeObserver(() => this.renderer.resize());
    this.resizeObserver.observe(canvas);
  }

  start(): void {
    this.renderer.resize();
    this.setInputEnabled(true);
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    this.setInputEnabled(false);
    this.resizeObserver.disconnect();
  }

  /** Turns keyboard and mouse control of the world on or off, e.g. while a menu is open. */
  setInputEnabled(enabled: boolean): void {
    if (enabled === this.inputAttached) return;
    this.inputAttached = enabled;
    if (enabled) {
      this.keyboard.attach();
      this.pointer.attach();
    } else {
      this.pointer.detach();
      this.keyboard.detach();
    }
  }

  /** Switches the look, fading over from the old one. */
  setSkin(skin: Skin): void {
    if (skin === this.renderer.skin) return;
    crossfade(this.canvas);
    this.renderer.skin = skin;
  }

  get blocks(): ReadonlyWorld {
    return this.simulation.blocks;
  }

  /** Derived power, for showing what is lit or powered. */
  get power(): PowerState {
    return this.simulation;
  }

  get tickCount(): number {
    return this.simulation.tickCount;
  }

  get paused(): boolean {
    return this.loop.paused;
  }

  set paused(paused: boolean) {
    this.loop.paused = paused;
  }

  /** Ticks per second as a multiple of the normal rate. */
  get speed(): number {
    return this.loop.speed;
  }

  set speed(speed: number) {
    this.loop.speed = speed;
  }

  /** The part of the bottom edge (left, right in canvas pixels) where edge scrolling is off. */
  set bottomEdgeGap(gap: readonly [number, number] | undefined) {
    this.pointer.bottomEdgeGap = gap;
  }

  /** Runs a single tick; meant for stepping through a paused simulation. */
  step(): void {
    this.simulation.step();
  }

  /** The cell under the mouse cursor, if it is over the world. */
  hoveredCell(): readonly [number, number] | undefined {
    return this.pointer.overlay().hover;
  }

  /** Reverses the latest edit; false if there is nothing to undo. */
  undo(): boolean {
    return this.afterEdit(this.history.undo());
  }

  /** Whether undo has run out because older edits were dropped, not because there were none. */
  get undoLimitReached(): boolean {
    return this.history.hasForgotten;
  }

  /** Repeats the latest undone edit; false if there is nothing to redo. */
  redo(): boolean {
    return this.afterEdit(this.history.redo());
  }

  private execute(command: Command): boolean {
    return this.afterEdit(this.history.execute(command));
  }

  private afterEdit(applied: boolean): boolean {
    if (applied) {
      this.renderer.invalidate();
      this.onEdit();
    }
    return applied;
  }

  private frame(dtMs: number, tickProgress: number): void {
    const [kx, ky] = this.keyboard.panDirection();
    const [ex, ey] = this.pointer.edgeScrollDirection();
    const distance = (PAN_SPEED_PX_PER_S * dtMs) / 1000;
    const dx = Math.sign(kx + ex);
    const dy = Math.sign(ky + ey);
    if (dx || dy) this.camera.panBy(dx * distance, dy * distance);
    this.renderer.drawIfChanged(this.simulation, this.pointer.overlay(), tickProgress);
  }
}
