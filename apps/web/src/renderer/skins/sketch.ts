import { Axis, MAX_DELAY, offset } from '@ruda/core';
import { faceToward, wireArms } from './shapes';
import { drawFromTable, type Look, type LookTable, type Skin } from './skin';

/** Colours of one variant of the hand-drawn skin. */
interface SketchPalette {
  readonly background: string;
  readonly grid: string;
  readonly hover: string;
  /** Pencil (or chalk) used for every outline. */
  readonly ink: string;
  readonly powerOn: string;
  readonly powerOff: string;
  readonly lampOn: string;
  readonly lampOff: string;
  /** The white-hot centre of a lit lamp or torch. */
  readonly glowCore: string;
  readonly source: string;
  readonly gem: string;
  readonly stone: string;
  readonly crack: string;
  readonly plate: string;
  readonly frame: string;
  readonly knob: string;
  readonly wood: string;
  readonly slot: string;
}

type Point = readonly [number, number];

/** How far the pencil wanders from a straight line, as a fraction of the cell. */
const WOBBLE = 0.012;
const OUTLINE = 0.03;
const WIRE_WIDTH = 0.17;

/**
 * Draws shapes in cell fractions (0–1) with a slightly wobbly pencil line. The wobble comes
 * from the cell's seed, so a block looks the same in every frame.
 */
class Pencil {
  private step = 0;

  constructor(
    private readonly g: CanvasRenderingContext2D,
    private readonly size: number,
    private readonly seed: number,
    private readonly ink: string,
  ) {}

  rect(x: number, y: number, w: number, h: number, fill: string, outline = true): void {
    this.shape(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ],
      fill,
      outline,
    );
  }

  circle(cx: number, cy: number, r: number, fill: string, outline = true): void {
    const points: Point[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    this.shape(points, fill, outline);
  }

  shape(points: readonly Point[], fill: string, outline = true): void {
    const { g } = this;
    this.trace(points, true);
    g.fillStyle = fill;
    g.fill();
    if (!outline) return;
    g.strokeStyle = this.ink;
    g.lineWidth = Math.max(1, this.size * OUTLINE);
    g.lineJoin = 'round';
    g.stroke();
  }

  line(points: readonly Point[], color: string, width: number, cap: CanvasLineCap = 'round'): void {
    const { g } = this;
    this.trace(points, false);
    g.strokeStyle = color;
    g.lineWidth = Math.max(1, this.size * width);
    g.lineCap = cap;
    g.stroke();
  }

  private trace(points: readonly Point[], closed: boolean): void {
    const { g, size } = this;
    g.beginPath();
    points.forEach(([x, y], i) => {
      const px = x * size + this.wobble();
      const py = y * size + this.wobble();
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    if (closed) g.closePath();
  }

  /** A deterministic offset in pixels; each call continues the cell's own sequence. */
  private wobble(): number {
    this.step++;
    let h = (this.seed * 374761393 + this.step * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const unit = ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
    return unit * 2 * WOBBLE * this.size;
  }
}

function looks(p: SketchPalette): LookTable {
  const pencil = (g: CanvasRenderingContext2D, size: number, seed: number): Pencil =>
    new Pencil(g, size, seed, p.ink);
  const power = (on: boolean | undefined): string => (on ? p.powerOn : p.powerOff);

  const wire: Look<'wire'> = (g, _block, s, { attached, powered }, seed) => {
    const pen = pencil(g, s, seed);
    const arms = wireArms(attached);
    const color = power(powered[Axis.Horizontal]);
    for (const side of arms.sides) {
      const [dx, dy] = offset(side);
      pen.line(
        [
          [0.5, 0.5],
          [0.5 + dx * arms.length, 0.5 + dy * arms.length],
        ],
        color,
        WIRE_WIDTH,
      );
    }
  };

  const crossing: Look<'crossing'> = (g, _block, s, { powered }, seed) => {
    const pen = pencil(g, s, seed);
    const gap = WIRE_WIDTH * 1.1;
    pen.line(
      [
        [0, 0.5],
        [1, 0.5],
      ],
      power(powered[Axis.Horizontal]),
      WIRE_WIDTH,
      'butt',
    );
    // A gap of bare paper shows that the vertical wire passes over without touching.
    pen.rect(0.5 - gap, 0.5 - gap, gap * 2, gap * 2, p.background, false);
    pen.line(
      [
        [0.5, 0],
        [0.5, 1],
      ],
      power(powered[Axis.Vertical]),
      WIRE_WIDTH,
      'butt',
    );
  };

  const redstoneBlock: Look<'redstone_block'> = (g, _block, s, _a, seed) => {
    const pen = pencil(g, s, seed);
    pen.rect(0.08, 0.08, 0.84, 0.84, p.source);
    pen.shape(
      [
        [0.5, 0.22],
        [0.78, 0.5],
        [0.5, 0.78],
        [0.22, 0.5],
      ],
      p.gem,
    );
    g.globalAlpha = 0.35;
    pen.shape(
      [
        [0.5, 0.22],
        [0.64, 0.36],
        [0.5, 0.5],
        [0.36, 0.36],
      ],
      '#ffffff',
      false,
    );
    g.globalAlpha = 1;
  };

  const stone: Look<'stone'> = (g, _block, s, _a, seed) => {
    const pen = pencil(g, s, seed);
    pen.rect(0.06, 0.06, 0.88, 0.88, p.stone);
    pen.line(
      [
        [0.3, 0.18],
        [0.42, 0.42],
        [0.36, 0.58],
        [0.5, 0.82],
      ],
      p.crack,
      0.035,
    );
  };

  const lamp: Look<'lamp'> = (g, _block, s, { lit }, seed) => {
    const pen = pencil(g, s, seed);
    pen.rect(0.06, 0.06, 0.88, 0.88, p.frame);
    if (lit) {
      pen.circle(0.5, 0.5, 0.33, p.lampOn);
      pen.circle(0.5, 0.5, 0.16, p.glowCore, false);
    } else {
      pen.circle(0.5, 0.5, 0.3, p.lampOff);
      g.globalAlpha = 0.22;
      pen.circle(0.42, 0.42, 0.07, '#ffffff', false);
      g.globalAlpha = 1;
    }
  };

  const lever: Look<'lever'> = (g, block, s, _a, seed) => {
    const pen = pencil(g, s, seed);
    pen.rect(0.12, 0.3, 0.76, 0.4, p.plate);
    pen.circle(block.on ? 0.68 : 0.32, 0.5, 0.15, block.on ? p.powerOn : p.knob);
  };

  const torch: Look<'torch'> = (g, block, s, _a, seed) => {
    faceToward(g, block.facing, s);
    const pen = pencil(g, s, seed);
    pen.rect(0.12, 0.58, 0.76, 0.3, p.plate);
    pen.rect(0.44, 0.36, 0.12, 0.26, p.wood);
    pen.shape(
      [
        [0.5, 0.04],
        [0.64, 0.27],
        [0.5, 0.42],
        [0.36, 0.27],
      ],
      power(block.lit),
    );
    if (block.lit) pen.circle(0.5, 0.29, 0.06, p.glowCore, false);
  };

  const delayer: Look<'delayer'> = (g, block, s, _a, seed) => {
    faceToward(g, block.facing, s);
    const pen = pencil(g, s, seed);
    pen.rect(0.1, 0.06, 0.8, 0.88, p.plate);
    pen.shape(
      [
        [0.5, 0.1],
        [0.72, 0.28],
        [0.28, 0.28],
      ],
      power(block.line[0]),
    );
    // One slot per tick of delay, front first, showing the signals travelling through the line.
    for (let i = 0; i < MAX_DELAY; i++) {
      const on = block.line[i];
      pen.rect(0.38, 0.36 + i * 0.14, 0.24, 0.1, on === undefined ? p.slot : power(on), false);
    }
  };

  const button: Look<'button'> = (g, block, s, _a, seed) => {
    const pen = pencil(g, s, seed);
    const pressed = block.remaining > 0;
    pen.rect(0.2, 0.2, 0.6, 0.6, p.frame);
    const inset = pressed ? 0.32 : 0.27;
    pen.rect(inset, inset, 1 - 2 * inset, 1 - 2 * inset, pressed ? p.powerOn : p.knob);
  };

  const piston: Look<'piston'> = (g, block, s, _a, seed) => {
    faceToward(g, block.facing, s);
    const pen = pencil(g, s, seed);
    pen.rect(0.04, 0.04, 0.92, 0.92, p.plate);
    // Extended, the face has moved out with the head; only the rod's base remains.
    if (block.extended) pen.rect(0.42, 0, 0.16, 0.5, p.wood);
    else pen.rect(0.04, 0.04, 0.92, 0.24, p.wood);
  };

  const pistonHead: Look<'piston_head'> = (g, block, s, _a, seed) => {
    faceToward(g, block.facing, s);
    const pen = pencil(g, s, seed);
    pen.rect(0.42, 0.2, 0.16, 0.82, p.wood);
    pen.rect(0.04, 0.04, 0.92, 0.24, p.wood);
  };

  return {
    redstone_block: redstoneBlock,
    lever,
    wire,
    crossing,
    lamp,
    torch,
    stone,
    delayer,
    button,
    piston,
    piston_head: pistonHead,
  };
}

function sketchSkin(palette: SketchPalette, dark: boolean): Skin {
  const table = looks(palette);
  return {
    background: palette.background,
    grid: palette.grid,
    hover: palette.hover,
    dark,
    light: { lamp: palette.lampOn, power: palette.powerOn },
    drawBlock: (g, block, size, appearance, seed = 0) =>
      drawFromTable(table, g, block, size, appearance, seed),
  };
}

/** Pencil on notebook paper; expert mode's light theme. */
export const sketchLightSkin = sketchSkin(
  {
    background: '#fbf8f1',
    grid: 'rgba(80, 130, 200, 0.16)',
    hover: 'rgba(45, 45, 45, 0.6)',
    ink: '#2d2d2d',
    powerOn: '#e63946',
    powerOff: '#cfc8bc',
    lampOn: '#ffcc1a',
    lampOff: '#8b8577',
    glowCore: '#fffbe0',
    source: '#e63946',
    gem: '#ff9aa2',
    stone: '#b8b2a7',
    crack: '#8f897e',
    plate: '#9fb7c9',
    frame: '#4a4640',
    knob: '#ffffff',
    wood: '#8d6e4c',
    slot: '#ddd5c4',
  },
  false,
);

/** Chalk on a blackboard; expert mode's dark theme. */
export const sketchDarkSkin = sketchSkin(
  {
    background: '#263530',
    grid: 'rgba(255, 255, 255, 0.05)',
    hover: 'rgba(236, 235, 228, 0.6)',
    ink: '#ecebe4',
    powerOn: '#ff6b6b',
    powerOff: '#5d6b64',
    lampOn: '#ffe066',
    lampOff: '#46534d',
    glowCore: '#fffbe6',
    source: '#ff6b6b',
    gem: '#ffb3b3',
    stone: '#6c7a73',
    crack: '#56635c',
    plate: '#8fa7b3',
    frame: '#1b2622',
    knob: '#ecebe4',
    wood: '#c7a57a',
    slot: '#3a4842',
  },
  true,
);
