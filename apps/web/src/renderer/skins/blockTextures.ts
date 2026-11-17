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
  cobble: ['#7a7a7a', '#878787', '#6c6c6c', '#929292'],
  mortar: '#4a4a4a',
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
  rod: '#9b8160',
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

/** Cobblestone: rounded stones of different shades, with dark mortar where two stones meet. */
function paintCobble(p: Painter, x0 = 0, y0 = 0, w = N, h = N): void {
  const seeds = Array.from({ length: 7 }, () => ({
    x: x0 + p.random() * w,
    y: y0 + p.random() * h,
    shade: pick(p.random, PALETTE.cobble),
  }));
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const near = seeds
        .map((s) => ({ s, d: Math.hypot(s.x - x - 0.5, s.y - y - 0.5) }))
        .sort((a, b) => a.d - b.d);
      const [first, second] = near;
      if (!first || !second) continue;
      const edge = second.d - first.d < 1.1;
      p.pixel(x, y, edge ? PALETTE.mortar : first.s.shade);
    }
  }
}

/** Wooden planks: four boards of four pixels with seams and one butt joint each. */
function paintPlanks(p: Painter, rows = N): void {
  for (let y = 0; y < rows; y += 4) {
    p.noise(0, y, N, Math.min(3, rows - y), PALETTE.planks);
    if (y + 3 < rows) p.rect(0, y + 3, N, 1, PALETTE.plankSeam);
    p.rect(Math.floor(p.random() * N), y, 1, Math.min(3, rows - y), PALETTE.plankSeam);
  }
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

export const cobbleTexture = textureCache((variant: number) =>
  paintTexture(23 + variant, (p) => paintCobble(p)),
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

export const leverTexture = textureCache((on: boolean) =>
  paintTexture(79, (p) => {
    paintCobble(p, 4, 5, 8, 10);
    // The handle leans towards the side the lever is flipped to.
    const tipX = on ? 12 : 3;
    for (let i = 0; i <= 7; i++) {
      const x = Math.round(7.5 + ((tipX - 7.5) * i) / 7);
      p.rect(x, 10 - i, 2, 1, i % 2 ? PALETTE.wood : PALETTE.woodDark);
    }
    p.rect(on ? 12 : 2, 1, 3, 3, on ? PALETTE.dustOn[0] : PALETTE.dustOff[0]);
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

/** A piston seen from above: wooden face at the front, cobblestone body with the rod inside. */
export const pistonTexture = textureCache((extended: boolean) =>
  paintTexture(103, (p) => {
    paintCobble(p, 0, 4, N, N - 4);
    p.rect(6, 5, 4, N - 6, PALETTE.mortar);
    p.rect(7, 5, 2, N - 6, PALETTE.slotUnused);
    if (extended) p.rect(6, 0, 4, 5, PALETTE.rod);
    else paintPlanks(p, 4);
  }),
);

export const pistonHeadTexture = lazyTexture(() =>
  paintTexture(107, (p) => {
    paintPlanks(p, 4);
    p.rect(6, 4, 4, N - 4, PALETTE.rod);
    p.rect(9, 4, 1, N - 4, PALETTE.wood);
  }),
);

/** Floors: each tile covers 2×2 cells, so the repetition is less obvious. */
export const FLOOR_CELLS = 2;

export const grassFloor = lazyTexture(() =>
  paintTexture(
    113,
    (p) => {
      p.noise(0, 0, p.width, p.height, ['#5d9b3a', '#67a83f', '#548d34', '#6aab43', '#5a9638']);
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(p.random() * p.width);
        const y = Math.floor(p.random() * p.height);
        p.pixel(x, y, p.random() < 0.5 ? '#77bb4d' : '#4a7f2d');
      }
    },
    N * FLOOR_CELLS,
  ),
);

export const smoothFloor = lazyTexture(() =>
  paintTexture(
    127,
    (p) => {
      for (let y = 0; y < p.height; y += N) {
        for (let x = 0; x < p.width; x += N) {
          p.noise(x, y, N, N, ['#c8c8c8', '#c3c3c3', '#cdcdcd']);
          p.rect(x, y, N, 1, '#d9d9d9');
          p.rect(x, y, 1, N, '#d9d9d9');
          p.rect(x, y + LAST, N, 1, '#a9a9a9');
          p.rect(x + LAST, y, 1, N, '#a9a9a9');
        }
      }
    },
    N * FLOOR_CELLS,
  ),
);

export const deepslateFloor = lazyTexture(() =>
  paintTexture(
    131,
    (p) => {
      p.noise(0, 0, p.width, p.height, ['#3a3a40', '#36363c', '#404046', '#333338']);
      // Deepslate tiles: four per cell, with dark seams.
      for (let at = 0; at < p.width; at += N / 2) {
        p.rect(at, 0, 1, p.height, '#28282c');
        p.rect(0, at, p.width, 1, '#28282c');
      }
    },
    N * FLOOR_CELLS,
  ),
);
