import { MAX_DELAY } from '@ruda/core';
import {
  lazyTexture,
  paintTexture,
  pick,
  textureCache,
  TEXTURE_SIZE,
  type Painter,
} from './texture';

/**
 * Minecraft-like 16×16 block textures shared by the textured game skins. Directional textures
 * are painted facing north; skins rotate them. Each texture with variants takes a variant
 * number (0–VARIANTS-1), so neighbouring blocks of one kind don't look copy-pasted.
 */

export const VARIANTS = 4;
const N = TEXTURE_SIZE;
const LAST = N - 1;

export const PALETTE = {
  stone: ['#7d7d7d', '#858585', '#747474', '#8b8b8b', '#797979'],
  stoneStreak: '#666666',
  planks: ['#a2824f', '#9a7b49', '#ab8a55', '#977645'],
  plankSeam: '#6a5230',
  smooth: ['#a9a9a9', '#a4a4a4', '#aeaeae'],
  smoothEdge: '#8a8a8a',
  smoothLight: '#c4c4c4',
  basalt: ['#3b3b41', '#36363c', '#414147'],
  basaltEdge: '#26262b',
  redstone: ['#a3180b', '#b51f10', '#93150a', '#bd2513'],
  redstoneDark: '#740f07',
  redstoneShine: '#e2513a',
  dustOn: ['#ff2a1a', '#e8190c', '#ff5a40', '#f2200f'],
  dustOff: ['#5c0e08', '#4a0a05', '#6b120b', '#530c07'],
  lampFrame: '#3a2414',
  lampOff: ['#6a4424', '#5c3a1e', '#74492a'],
  lampOffLine: '#4a2c16',
  lampOn: ['#ffe08a', '#f7c55a', '#ffd27a', '#fff0b8'],
  lampOnLine: '#c9822e',
  wood: '#6b4f2e',
  woodDark: '#4f3a20',
  woodLight: '#8a6a3e',
  leverOutline: '#2a2a2a',
  pistonBody: ['#7d7d7d', '#808080', '#7a7a7a'],
  pistonRecess: '#5a5a5a',
  pistonSocket: '#3e3e3e',
  pistonSocketBack: '#333333',
  rod: '#c9c9c9',
  rodShade: '#8e8e8e',
  torchOn: ['#ff2a1a', '#ff6a40', '#ffd0b0'],
  torchOff: ['#5e1a10', '#4a120a'],
  buttonFace: '#b0b0b0',
  buttonLight: '#d2d2d2',
  buttonDark: '#5f5f5f',
  slotUnused: '#4d4d4d',
} as const;

const dust = (on: boolean): readonly string[] => (on ? PALETTE.dustOn : PALETTE.dustOff);

/** Speckled grey stone with a few darker streaks. */
function paintStone(p: Painter): void {
  p.noise(0, 0, N, N, PALETTE.stone);
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(p.random() * (N - 3));
    const y = Math.floor(p.random() * N);
    p.rect(x, y, 2 + Math.floor(p.random() * 2), 1, PALETTE.stoneStreak);
  }
}

/** Rows of the piston's wooden face plate at the front (north) edge. */
export const PLATE_ROWS = 4;

/** The rod's place across the piston: its left column and its width, in texels. */
export const ROD_X = 6;
export const ROD_WIDTH = 4;

/** How far back from the face plate the rod reaches while the head is not out, in texels. */
export const ROD_LEAD = 8;

/** How deep the face plate is, as a share of the cell. */
export const PLATE_DEPTH = PLATE_ROWS / N;

/**
 * The look of a block standing up from the floor: a dark outline and, inside it, a one-texel
 * bevel, light along the top and left edge and dark along the bottom and right.
 */
export function paintBevel(
  p: Pick<Painter, 'rect'>,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const outline = 'rgba(0, 0, 0, 0.6)';
  p.rect(x, y, w, 1, outline);
  p.rect(x, y + h - 1, w, 1, outline);
  p.rect(x, y + 1, 1, h - 2, outline);
  p.rect(x + w - 1, y + 1, 1, h - 2, outline);
  const light = 'rgba(255, 255, 255, 0.28)';
  p.rect(x + 1, y + 1, w - 2, 1, light);
  p.rect(x + 1, y + 2, 1, h - 3, light);
  const shade = 'rgba(0, 0, 0, 0.32)';
  p.rect(x + 2, y + h - 2, w - 3, 1, shade);
  p.rect(x + w - 2, y + 2, 1, h - 4, shade);
}

/** The piston's wooden face plate: one plain board with a dark seam behind it. */
function paintPlate(p: Painter): void {
  p.noise(0, 0, N, PLATE_ROWS - 1, PALETTE.planks);
  p.rect(0, PLATE_ROWS - 1, N, 1, PALETTE.plankSeam);
}

/** The piston's metal rod, four pixels wide and shaded on its right. */
function paintRod(p: Painter, y: number, length: number): void {
  p.rect(ROD_X, y, ROD_WIDTH, length, PALETTE.rod);
  p.rect(ROD_X + ROD_WIDTH - 1, y, 1, length, PALETTE.rodShade);
}

/** A smooth stone slab: flat grey with a light top-left and dark bottom-right edge. */
function paintSmooth(p: Painter, x = 0, y = 0, w = N, h = N): void {
  p.noise(x, y, w, h, PALETTE.smooth);
  p.rect(x, y, w, 1, PALETTE.smoothLight);
  p.rect(x, y, 1, h, PALETTE.smoothLight);
  p.rect(x, y + h - 1, w, 1, PALETTE.smoothEdge);
  p.rect(x + w - 1, y, 1, h, PALETTE.smoothEdge);
}

export const stoneTexture = textureCache((variant: number) =>
  paintTexture(11 + variant, paintStone),
);

export const powerBlockTexture = textureCache((variant: number) =>
  paintTexture(37 + variant, (p) => {
    p.noise(0, 0, N, N, PALETTE.redstone);
    // A dark lattice with bright speckles, like a block of compressed dust.
    for (let i = 2; i < N; i += 5) {
      p.rect(i, 0, 1, N, PALETTE.redstoneDark);
      p.rect(0, i, N, 1, PALETTE.redstoneDark);
    }
    for (let i = 0; i < 7; i++) {
      p.pixel(Math.floor(p.random() * N), Math.floor(p.random() * N), PALETTE.redstoneShine);
    }
  }),
);

export const lampTexture = textureCache((lit: boolean) =>
  paintTexture(53, (p) => {
    p.rect(0, 0, N, N, PALETTE.lampFrame);
    p.noise(1, 1, N - 2, N - 2, lit ? PALETTE.lampOn : PALETTE.lampOff);
    const line = lit ? PALETTE.lampOnLine : PALETTE.lampOffLine;
    for (const at of [5, 10]) {
      p.rect(at, 1, 1, N - 2, line);
      p.rect(1, at, N - 2, 1, line);
    }
  }),
);

/**
 * Redstone dust pieces: the blob in the middle, and an arm from it to the north edge (or a
 * short stub when the wire is not attached to anything). On and off share one shape.
 */
export const dustCenterTexture = textureCache((on: boolean) =>
  paintTexture(61, (p) => {
    for (let y = 5; y <= 10; y++) {
      for (let x = 5; x <= 10; x++) {
        const corner = (x === 5 || x === 10) && (y === 5 || y === 10);
        const color = pick(p.random, dust(on));
        if (!corner || p.random() < 0.4) p.pixel(x, y, color);
      }
    }
  }),
);

export const dustArmTexture = textureCache((key: `${boolean}-${'short' | 'full'}`) => {
  const [on, length] = key.split('-');
  return paintTexture(67, (p) => {
    const start = length === 'short' ? 4 : 0;
    for (let y = start; y < 7; y++) {
      for (let x = 6; x <= 9; x++) {
        const edge = x === 6 || x === 9;
        const color = pick(p.random, dust(on === 'true'));
        if (!edge || p.random() < 0.75) p.pixel(x, y, color);
      }
    }
  });
});

export const crossingTexture = textureCache((key: `${boolean}-${boolean}`) => {
  const [horizontal, vertical] = key.split('-').map((on) => on === 'true');
  return paintTexture(71, (p) => {
    p.noise(2, 2, N - 4, N - 4, PALETTE.basalt);
    p.rect(2, LAST - 2, N - 4, 1, PALETTE.basaltEdge);
    p.rect(LAST - 2, 2, 1, N - 4, PALETTE.basaltEdge);
    p.noise(0, 6, N, 4, dust(horizontal ?? false));
    // The vertical wire bridges over the horizontal one, with a dark gap either side.
    p.rect(4, 5, 8, 6, PALETTE.basaltEdge);
    p.noise(6, 0, 4, N, dust(vertical ?? false));
  });
});

/**
 * A slide switch: a stone plate with a slot and a wooden slider, at the bottom when off and at
 * the top when on, where the open slot behind it glows.
 */
export const leverTexture = textureCache((on: boolean) =>
  paintTexture(79, (p) => {
    paintSmooth(p, 2, 1, 12, 14);
    p.rect(2, 1, 12, 1, PALETTE.leverOutline);
    p.rect(2, LAST - 1, 12, 1, PALETTE.leverOutline);
    p.rect(2, 1, 1, 14, PALETTE.leverOutline);
    p.rect(13, 1, 1, 14, PALETTE.leverOutline);
    p.rect(6, 3, 4, 10, PALETTE.leverOutline);
    if (on) {
      p.noise(7, 3, 2, 10, PALETTE.dustOn);
      p.rect(7, 7, 1, 5, PALETTE.torchOn[2]);
    }
    const y = on ? 3 : 9;
    p.rect(5, y, 6, 4, PALETTE.leverOutline);
    p.rect(6, y + 1, 4, 1, PALETTE.woodLight);
    p.rect(6, y + 2, 4, 1, PALETTE.woodDark);
  }),
);

export const torchTexture = textureCache((lit: boolean) =>
  paintTexture(83, (p) => {
    // The back half is the block the torch hangs on.
    p.noise(0, 8, N, 8, PALETTE.stone);
    p.rect(7, 5, 2, 7, PALETTE.wood);
    p.rect(8, 5, 1, 7, PALETTE.woodDark);
    const flame = lit ? PALETTE.torchOn : PALETTE.torchOff;
    p.rect(7, 2, 2, 4, flame[0]);
    p.rect(6, 3, 4, 2, flame[0]);
    if (lit) p.pixel(7, 3, PALETTE.torchOn[2]);
    else p.pixel(8, 4, PALETTE.torchOff[1]);
  }),
);

/** A repeater-like slab: an arrow at the front and one slot per tick of delay behind it. */
export const delayerTexture = textureCache((line: string) =>
  paintTexture(89, (p) => {
    paintSmooth(p);
    const front = dust(line[0] === '1');
    p.rect(7, 1, 2, 1, pick(p.random, front));
    p.rect(6, 2, 4, 1, pick(p.random, front));
    p.rect(5, 3, 6, 1, pick(p.random, front));
    for (let i = 0; i < MAX_DELAY; i++) {
      const state = line[i];
      const y = 5 + i * 3;
      if (state === undefined) p.rect(6, y, 4, 2, PALETTE.slotUnused);
      else p.noise(6, y, 4, 2, dust(state === '1'));
    }
  }),
);

/** The key a delayer's line is cached under: one character per slot, '1' for a signal. */
export const delayerLineKey = (line: readonly boolean[]): string =>
  line.map((on) => (on ? '1' : '0')).join('');

export const buttonTexture = textureCache((pressed: boolean) =>
  paintTexture(97, (p) => {
    paintSmooth(p, 3, 3, 10, 10);
    if (pressed) {
      p.rect(5, 5, 6, 6, PALETTE.buttonDark);
      p.noise(6, 6, 4, 4, PALETTE.dustOn);
    } else {
      p.rect(5, 5, 6, 6, PALETTE.buttonDark);
      p.rect(5, 5, 5, 5, PALETTE.buttonLight);
      p.rect(6, 6, 4, 4, PALETTE.buttonFace);
    }
  }),
);

/**
 * A piston seen from above: a plain grey body with the socket the face plate sits in and, behind
 * it, the groove the rod slides in; the groove opens into the socket, so the rod comes from
 * inside the body. With `plated`, the head is home: the plate sits in its socket and the rod is
 * tucked in behind it. Otherwise the head is out, or on its way, and drawn on its own.
 */
export const pistonTexture = textureCache((plated: boolean) =>
  paintTexture(103, (p) => {
    p.noise(0, 0, N, N, PALETTE.pistonBody);
    p.rect(1, 1, N - 2, PLATE_ROWS - 1, PALETTE.pistonSocket);
    p.rect(1, PLATE_ROWS, N - 2, 1, PALETTE.pistonSocketBack);
    p.rect(ROD_X - 1, PLATE_ROWS, ROD_WIDTH + 2, N - PLATE_ROWS - 3, PALETTE.pistonRecess);
    if (plated) {
      paintRod(p, PLATE_ROWS, ROD_LEAD);
      paintPlate(p);
      paintBevel(p, 0, 0, N, PLATE_ROWS);
    }
  }),
);

/** The face plate of a head, standing up like the piston it came from; the rod is drawn apart. */
export const pistonHeadTexture = lazyTexture(() =>
  paintTexture(107, (p) => {
    paintPlate(p);
    paintBevel(p, 0, 0, N, PLATE_ROWS);
  }),
);

/** The floor tile covers 2×2 cells, so the noise repeats less obviously. */
const FLOOR_CELLS = 2;

/** Colours of one slab floor: the noise, then the lit and the shaded edge. */
interface SlabColors {
  readonly fill: readonly string[];
  readonly light: string;
  readonly shade: string;
}

function slabTexture(seed: number, colors: SlabColors): HTMLCanvasElement {
  return paintTexture(
    seed,
    (p) => {
      for (let y = 0; y < p.height; y += N) {
        for (let x = 0; x < p.width; x += N) {
          p.noise(x, y, N, N, colors.fill);
          p.rect(x, y, N, 1, colors.light);
          p.rect(x, y, 1, N, colors.light);
          p.rect(x, y + LAST, N, 1, colors.shade);
          p.rect(x + LAST, y, 1, N, colors.shade);
        }
      }
    },
    N * FLOOR_CELLS,
  );
}

/** A floor of warm smooth stone slabs, each with a light top-left and a dark bottom-right edge. */
export const slabFloor = lazyTexture(() =>
  slabTexture(127, { fill: ['#d2ccc0', '#cdc7bb', '#d7d1c5'], light: '#e3ded4', shade: '#afa899' }),
);

/** The same slabs at night: dark and cool, so light pools stand out. */
export const nightSlabFloor = lazyTexture(() =>
  slabTexture(127, { fill: ['#2a2c31', '#282a2f', '#2d2f34'], light: '#35383e', shade: '#1c1d21' }),
);
