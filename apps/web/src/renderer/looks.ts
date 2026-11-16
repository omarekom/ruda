import { Axis, Direction, MAX_DELAY, type Block, type BlockOf, type BlockType } from '@ruda/core';

/** Everything about a cell's surroundings and power that affects how it is drawn. */
export interface CellAppearance {
  /** Wire attachments, indexed by Direction. */
  readonly attached: readonly boolean[];
  /** Channel power, indexed by Axis. */
  readonly powered: readonly boolean[];
  readonly lit: boolean;
}

/** Draws a block into the square (0, 0)–(size, size) of the context. */
type Look<T extends BlockType> = (
  g: CanvasRenderingContext2D,
  block: BlockOf<T>,
  size: number,
  appearance: CellAppearance,
) => void;

const COLORS = {
  wireOff: '#5c1410',
  wireOn: '#ff3b2f',
  redstone: '#b3261e',
  redstoneDark: '#7d1712',
  stone: '#7a7a7a',
  stoneDark: '#666666',
  lampOff: '#4a3a22',
  lampOn: '#ffd75e',
  lampFrame: '#2e2414',
  wood: '#6b4f2e',
  plate: '#6d6d6d',
  plateDark: '#4b4b4b',
  torchOff: '#4a1a15',
  torchOn: '#ff5a2a',
  crossingPlate: '#2b2d33',
  buttonUp: '#9a9a9a',
  slotUnused: '#3c3c3c',
} as const;

/** Rotates the context so that a look drawn facing north faces `facing`. */
function faceToward(g: CanvasRenderingContext2D, facing: Direction, size: number): void {
  g.translate(size / 2, size / 2);
  g.rotate((facing * Math.PI) / 2);
  g.translate(-size / 2, -size / 2);
}

const wireColor = (on: boolean): string => (on ? COLORS.wireOn : COLORS.wireOff);

const drawWire: Look<'wire'> = (g, _block, s, { attached, powered }) => {
  const w = Math.max(2, s * 0.22);
  const c = s / 2;
  g.fillStyle = wireColor(powered[Axis.Horizontal] ?? false);
  const sides = [Direction.North, Direction.East, Direction.South, Direction.West];
  const count = sides.filter((side) => attached[side]).length;
  // An unattached wire is drawn as a plus; a wire attached on one side runs straight through.
  const shown = sides.filter((side) => {
    if (count === 0) return true;
    if (count === 1) return attached[side] || attached[(side + 2) % 4];
    return attached[side];
  });
  const arm = count === 0 ? s * 0.3 : c;
  g.fillRect(c - w / 2, c - w / 2, w, w);
  for (const side of shown) {
    if (side === Direction.North) g.fillRect(c - w / 2, c - arm, w, arm);
    if (side === Direction.South) g.fillRect(c - w / 2, c, w, arm);
    if (side === Direction.West) g.fillRect(c - arm, c - w / 2, arm, w);
    if (side === Direction.East) g.fillRect(c, c - w / 2, arm, w);
  }
};

const drawCrossing: Look<'crossing'> = (g, _block, s, { powered }) => {
  const w = Math.max(2, s * 0.22);
  const c = s / 2;
  g.fillStyle = COLORS.crossingPlate;
  g.fillRect(s * 0.15, s * 0.15, s * 0.7, s * 0.7);
  g.fillStyle = wireColor(powered[Axis.Horizontal] ?? false);
  g.fillRect(0, c - w / 2, s, w);
  // The vertical wire bridges over the horizontal one, with a dark gap to show they are separate.
  g.fillStyle = COLORS.crossingPlate;
  g.fillRect(c - w, c - w, w * 2, w * 2);
  g.fillStyle = wireColor(powered[Axis.Vertical] ?? false);
  g.fillRect(c - w / 2, 0, w, s);
};

const drawRedstoneBlock: Look<'redstone_block'> = (g, _block, s) => {
  g.fillStyle = COLORS.redstone;
  g.fillRect(0, 0, s, s);
  g.fillStyle = COLORS.redstoneDark;
  const d = s * 0.18;
  for (const [x, y] of [
    [0.2, 0.2],
    [0.6, 0.3],
    [0.3, 0.65],
    [0.68, 0.7],
  ] as const) {
    g.fillRect(x * s, y * s, d, d);
  }
};

const drawStone: Look<'stone'> = (g, _block, s) => {
  g.fillStyle = COLORS.stone;
  g.fillRect(0, 0, s, s);
  g.fillStyle = COLORS.stoneDark;
  const d = s * 0.14;
  for (const [x, y] of [
    [0.15, 0.25],
    [0.55, 0.15],
    [0.7, 0.6],
    [0.25, 0.7],
  ] as const) {
    g.fillRect(x * s, y * s, d, d);
  }
};

const drawLamp: Look<'lamp'> = (g, _block, s, { lit }) => {
  g.fillStyle = COLORS.lampFrame;
  g.fillRect(0, 0, s, s);
  g.fillStyle = lit ? COLORS.lampOn : COLORS.lampOff;
  const m = s * 0.1;
  g.fillRect(m, m, s - 2 * m, s - 2 * m);
  g.strokeStyle = COLORS.lampFrame;
  g.lineWidth = Math.max(1, s * 0.06);
  g.beginPath();
  g.moveTo(s / 2, m);
  g.lineTo(s / 2, s - m);
  g.moveTo(m, s / 2);
  g.lineTo(s - m, s / 2);
  g.stroke();
};

const drawLever: Look<'lever'> = (g, block, s) => {
  g.fillStyle = COLORS.plateDark;
  g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
  g.fillStyle = COLORS.plate;
  g.fillRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4);
  const tipX = block.on ? 0.78 : 0.22;
  g.strokeStyle = COLORS.wood;
  g.lineWidth = Math.max(2, s * 0.1);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(s / 2, s / 2);
  g.lineTo(tipX * s, 0.22 * s);
  g.stroke();
  g.fillStyle = block.on ? COLORS.wireOn : COLORS.wireOff;
  g.beginPath();
  g.arc(tipX * s, 0.22 * s, s * 0.09, 0, Math.PI * 2);
  g.fill();
};

const drawTorch: Look<'torch'> = (g, block, s) => {
  g.save();
  // Drawn facing north, then rotated: the back half is the block it is attached to.
  faceToward(g, block.facing, s);
  g.fillStyle = COLORS.plateDark;
  g.fillRect(0, s / 2, s, s / 2);
  g.fillStyle = COLORS.wood;
  g.fillRect(s * 0.42, s * 0.2, s * 0.16, s * 0.42);
  g.fillStyle = block.lit ? COLORS.torchOn : COLORS.torchOff;
  if (block.lit) {
    g.shadowColor = COLORS.torchOn;
    g.shadowBlur = s * 0.3;
  }
  g.beginPath();
  g.arc(s / 2, s * 0.2, s * 0.14, 0, Math.PI * 2);
  g.fill();
  g.restore();
};

const drawDelayer: Look<'delayer'> = (g, block, s) => {
  g.save();
  faceToward(g, block.facing, s);
  g.fillStyle = COLORS.plateDark;
  g.fillRect(s * 0.08, s * 0.04, s * 0.84, s * 0.92);
  g.fillStyle = wireColor(block.line[0] ?? false);
  g.beginPath();
  g.moveTo(s / 2, s * 0.08);
  g.lineTo(s * 0.78, s * 0.3);
  g.lineTo(s * 0.22, s * 0.3);
  g.closePath();
  g.fill();
  // One slot per tick of delay, front first, showing the signals travelling through the line.
  const slot = 0.56 / MAX_DELAY;
  for (let i = 0; i < MAX_DELAY; i++) {
    const on = block.line[i];
    g.fillStyle = on === undefined ? COLORS.slotUnused : wireColor(on);
    g.fillRect(s * 0.38, s * (0.36 + i * slot), s * 0.24, s * (slot - 0.03));
  }
  g.restore();
};

const drawButton: Look<'button'> = (g, block, s) => {
  const pressed = block.remaining > 0;
  g.fillStyle = COLORS.plateDark;
  g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
  const inset = pressed ? 0.34 : 0.28;
  g.fillStyle = pressed ? COLORS.wireOn : COLORS.buttonUp;
  g.fillRect(s * inset, s * inset, s * (1 - 2 * inset), s * (1 - 2 * inset));
};

const drawPiston: Look<'piston'> = (g, block, s) => {
  g.save();
  faceToward(g, block.facing, s);
  g.fillStyle = COLORS.plateDark;
  g.fillRect(0, 0, s, s);
  g.fillStyle = COLORS.stone;
  g.fillRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84);
  if (block.extended) {
    // The face has moved out with the head; only the rod's base remains.
    g.fillStyle = COLORS.wood;
    g.fillRect(s * 0.4, 0, s * 0.2, s * 0.5);
  } else {
    g.fillStyle = COLORS.wood;
    g.fillRect(0, 0, s, s * 0.24);
  }
  g.restore();
};

const drawPistonHead: Look<'piston_head'> = (g, block, s) => {
  g.save();
  faceToward(g, block.facing, s);
  g.fillStyle = COLORS.wood;
  g.fillRect(0, 0, s, s * 0.24);
  g.fillRect(s * 0.4, s * 0.24, s * 0.2, s * 0.76);
  g.restore();
};

const LOOKS: { readonly [T in BlockType]: Look<T> } = {
  redstone_block: drawRedstoneBlock,
  lever: drawLever,
  wire: drawWire,
  crossing: drawCrossing,
  lamp: drawLamp,
  torch: drawTorch,
  stone: drawStone,
  delayer: drawDelayer,
  button: drawButton,
  piston: drawPiston,
  piston_head: drawPistonHead,
};

export function drawBlock(
  g: CanvasRenderingContext2D,
  block: Block,
  size: number,
  appearance: CellAppearance,
): void {
  // The registry pairs each type with its own look; TypeScript cannot correlate the union here.
  const look = LOOKS[block.type] as Look<BlockType>;
  look(g, block, size, appearance);
}

/** How a block looks on its own, e.g. in the hotbar. */
export const ISOLATED: CellAppearance = {
  attached: [false, true, false, true],
  powered: [true, true],
  lit: true,
};
