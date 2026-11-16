import { isInteractive, type Command, type ReadonlyWorld, type Simulation } from '@ruda/core';
import { KeyboardInput } from '../input/keyboard';
import { PointerInput } from '../input/pointer';
import { Camera } from '../renderer/camera';
import { Renderer } from '../renderer/renderer';
import type { HotbarState } from './hotbar';
import { TickLoop } from './tickLoop';

const PAN_SPEED_PX_PER_S = 700;

/** Wires the simulation to the canvas: real-time ticks, rendering and input. */
export class Game {
  private readonly camera = new Camera();
  private readonly renderer: Renderer;
  private readonly keyboard: KeyboardInput;
  private readonly pointer: PointerInput;
  private readonly loop: TickLoop;
  private readonly resizeObserver: ResizeObserver;

  /** `onEdit` runs after every command that changed the world. */
  constructor(
    canvas: HTMLCanvasElement,
    hotbar: HotbarState,
    private readonly simulation: Simulation,
    private readonly onEdit: () => void,
  ) {
    this.renderer = new Renderer(canvas, this.camera);
    this.keyboard = new KeyboardInput(hotbar);
    this.pointer = new PointerInput(
      canvas,
      this.camera,
      hotbar,
      (command) => this.execute(command),
      (x, y) => {
        const block = this.simulation.blocks.get(x, y);
        return block !== undefined && isInteractive(block);
      },
    );
    this.loop = new TickLoop(
      () => this.simulation.step(),
      (dt) => this.frame(dt),
    );
    this.resizeObserver = new ResizeObserver(() => this.renderer.resize());
    this.resizeObserver.observe(canvas);
  }

  start(): void {
    this.renderer.resize();
    this.keyboard.attach();
    this.pointer.attach();
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
    this.pointer.detach();
    this.keyboard.detach();
    this.resizeObserver.disconnect();
  }

  get blocks(): ReadonlyWorld {
    return this.simulation.blocks;
  }

  private execute(command: Command): boolean {
    const applied = this.simulation.execute(command);
    if (applied) this.onEdit();
    return applied;
  }

  private frame(dtMs: number): void {
    const [kx, ky] = this.keyboard.panDirection();
    const [ex, ey] = this.pointer.edgeScrollDirection();
    const distance = (PAN_SPEED_PX_PER_S * dtMs) / 1000;
    const dx = Math.sign(kx + ex);
    const dy = Math.sign(ky + ey);
    if (dx || dy) this.camera.panBy(dx * distance, dy * distance);
    this.renderer.draw(this.simulation, this.pointer.overlay());
  }
}
