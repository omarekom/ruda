/**
 * Tiny pixel-art textures painted once in code. They are drawn so that changing their size
 * never shimmers: enlarged with sharp edges that move smoothly, shrunk from smaller, averaged
 * copies (mipmaps). Painting is driven by a seeded random generator, so every texture
 * looks the same on every run.
 */

/** Pixels per cell side in a texture. */
export const TEXTURE_SIZE = 16;

export type Random = () => number;

/** mulberry32: small, fast and good enough for picking pixel colours. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(random: Random, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
}

/** Drawing helpers over a texture's pixel grid. */
export interface Painter {
  readonly random: Random;
  readonly width: number;
  readonly height: number;
  pixel(x: number, y: number, color: string): void;
  rect(x: number, y: number, w: number, h: number, color: string): void;
  /** Fills a rectangle with colours picked at random from the palette, pixel by pixel. */
  noise(x: number, y: number, w: number, h: number, palette: readonly string[]): void;
}

export function paintTexture(
  seed: number,
  paint: (p: Painter) => void,
  width = TEXTURE_SIZE,
  height = width,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('Canvas 2D is not supported');
  const random = seededRandom(seed);
  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  paint({
    random,
    width,
    height,
    pixel: (x, y, color) => rect(x, y, 1, 1, color),
    rect,
    noise(x, y, w, h, palette) {
      for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) rect(px, py, 1, 1, pick(random, palette));
      }
    },
  });
  return canvas;
}

/** Remembers textures by key, so each one is painted only the first time it is needed. */
export function textureCache<K>(
  paint: (key: K) => HTMLCanvasElement,
): (key: K) => HTMLCanvasElement {
  const cache = new Map<K, HTMLCanvasElement>();
  return (key) => {
    let texture = cache.get(key);
    if (!texture) {
      texture = paint(key);
      cache.set(key, texture);
    }
    return texture;
  };
}

/** A single texture, painted the first time it is needed. */
export function lazyTexture(paint: () => HTMLCanvasElement): () => HTMLCanvasElement {
  let texture: HTMLCanvasElement | undefined;
  return () => (texture ??= paint());
}

const mipmaps = new WeakMap<HTMLCanvasElement, readonly HTMLCanvasElement[]>();

/** Halves the texture again and again down to a single pixel, each step averaging 2×2 pixels. */
function mipChain(texture: HTMLCanvasElement): readonly HTMLCanvasElement[] {
  let chain = mipmaps.get(texture);
  if (chain) return chain;
  const levels = [texture];
  for (let level = texture; level.width > 1 || level.height > 1;) {
    const smaller = document.createElement('canvas');
    smaller.width = Math.max(1, level.width >> 1);
    smaller.height = Math.max(1, level.height >> 1);
    const g = smaller.getContext('2d');
    if (!g) break;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(level, 0, 0, smaller.width, smaller.height);
    levels.push(smaller);
    level = smaller;
  }
  chain = levels;
  mipmaps.set(texture, chain);
  return chain;
}

/** Enlarging beyond this many pixels per texel looks the same, so it is not worth the memory. */
const MAX_UPSCALE = 8;
const upscaled = new WeakMap<HTMLCanvasElement, Map<number, HTMLCanvasElement>>();

/** The texture enlarged by a whole factor, each texel becoming a crisp square of pixels. */
function upscale(texture: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  let sizes = upscaled.get(texture);
  if (!sizes) {
    sizes = new Map();
    upscaled.set(texture, sizes);
  }
  let image = sizes.get(factor);
  if (!image) {
    image = document.createElement('canvas');
    image.width = texture.width * factor;
    image.height = texture.height * factor;
    const g = image.getContext('2d');
    if (g) {
      g.imageSmoothingEnabled = false;
      g.drawImage(texture, 0, 0, image.width, image.height);
    }
    sizes.set(factor, image);
  }
  return image;
}

/**
 * What to draw, with smoothing on, for a texture `pixels` device pixels wide; `next` is a
 * smaller level to blend over with `weight`, for when levels must not pop while zooming.
 *
 * - Enlarged, it is first scaled up by the next whole factor without smoothing, then smoothed
 *   down the rest of the way ("sharp bilinear"): texels stay crisp squares, but their edges
 *   fall between pixels softly instead of jumping a whole pixel as the size changes.
 * - Shrunk, it comes from mipmaps: the smallest level at least that wide, plus the next one.
 */
export function textureForSize(
  texture: HTMLCanvasElement,
  pixels: number,
): {
  readonly image: HTMLCanvasElement;
  readonly next?: { readonly image: HTMLCanvasElement; readonly weight: number };
} {
  const ratio = pixels / texture.width;
  if (ratio >= 1) {
    const factor = Math.min(MAX_UPSCALE, Math.ceil(ratio - 0.001));
    return { image: factor === 1 ? texture : upscale(texture, factor) };
  }
  const chain = mipChain(texture);
  const level = Math.log2(1 / ratio);
  const index = Math.min(chain.length - 1, Math.floor(level));
  const image = chain[index] ?? texture;
  const next = chain[index + 1];
  return next ? { image, next: { image: next, weight: level - index } } : { image };
}

/** A single pixel holding the texture's average colour. */
export function averagePixel(texture: HTMLCanvasElement): HTMLCanvasElement {
  return mipChain(texture).at(-1) ?? texture;
}

/** How many device pixels one unit of the context's current transform covers. */
export function deviceScale(g: CanvasRenderingContext2D): number {
  const { a, b } = g.getTransform();
  return Math.hypot(a, b);
}

/** Draws a texture over the square (0, 0)–(size, size). */
export function drawTexture(
  g: CanvasRenderingContext2D,
  texture: HTMLCanvasElement,
  size: number,
): void {
  const { image } = textureForSize(texture, size * deviceScale(g));
  g.imageSmoothingEnabled = true;
  g.drawImage(image, 0, 0, size, size);
}
