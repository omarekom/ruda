import { Axis, type Block } from '@ruda/core';
import type { Skin } from './skins/skin';
import { textureForSize } from './skins/texture';

/** The part of the simulation lighting reads; derived power is only computed when needed. */
export interface PowerState {
  isLampLit(x: number, y: number): boolean;
  isChannelPowered(x: number, y: number, axis: Axis): boolean;
}

/** A soft round glow, in cell units, centred on a cell. */
export interface Light {
  readonly x: number;
  readonly y: number;
  /** Radius in cells. */
  readonly radius: number;
  /** Opacity at the centre, 0–1. */
  readonly strength: number;
  readonly color: string;
}

type LightSpec = Omit<Light, 'x' | 'y' | 'color'> & { readonly kind: 'lamp' | 'power' };

const LAMP: LightSpec = { kind: 'lamp', radius: 4.8, strength: 0.34 };
const TORCH: LightSpec = { kind: 'power', radius: 2.2, strength: 0.22 };
const SOURCE: LightSpec = { kind: 'power', radius: 2.4, strength: 0.24 };
const SMALL: LightSpec = { kind: 'power', radius: 1.4, strength: 0.14 };
const WIRE: LightSpec = { kind: 'power', radius: 1, strength: 0.07 };

/** How far (in cells) a light can reach; blocks this far off screen can still light it. */
export const MAX_LIGHT_RADIUS = LAMP.radius;

/** Below this cell size the glow is too small to matter and is skipped. */
export const MIN_LIGHT_CELL_SIZE = 6;

/** Gradient stops (position, share of the centre strength): a gentle, roughly quadratic falloff. */
const FALLOFF: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.25, 0.66],
  [0.5, 0.33],
  [0.75, 0.1],
  [1, 0],
];

function specOf(x: number, y: number, block: Block, power: PowerState): LightSpec | undefined {
  switch (block.type) {
    case 'lamp':
      return power.isLampLit(x, y) ? LAMP : undefined;
    case 'torch':
      return block.lit ? TORCH : undefined;
    case 'power_block':
      return SOURCE;
    case 'lever':
      return block.on ? SMALL : undefined;
    case 'button':
      return block.remaining > 0 ? SMALL : undefined;
    case 'delayer':
      return block.line[0] ? SMALL : undefined;
    case 'wire':
    case 'crossing':
      return power.isChannelPowered(x, y, Axis.Horizontal) ||
        power.isChannelPowered(x, y, Axis.Vertical)
        ? WIRE
        : undefined;
    default:
      return undefined;
  }
}

/** The light a block casts in its cell, if it is lit. */
export function lightOf(
  x: number,
  y: number,
  block: Block,
  power: PowerState,
  skin: Skin,
): Light | undefined {
  const spec = specOf(x, y, block, power);
  if (!spec) return undefined;
  const color = spec.kind === 'lamp' ? skin.light.lamp : skin.light.power;
  return { x, y, radius: spec.radius, strength: spec.strength, color };
}

/** Resolution of a pre-painted glow; it is scaled to each light's size when drawn. */
const SPRITE_SIZE = 256;
const sprites = new Map<string, HTMLCanvasElement>();

/**
 * A fully opaque glow of the colour, painted once: drawing an image is much cheaper than
 * building and filling a radial gradient for every light in every frame. Its strength is
 * applied with globalAlpha, which keeps faint glows from losing precision in the sprite.
 */
function glowSprite(color: string): HTMLCanvasElement {
  let sprite = sprites.get(color);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = SPRITE_SIZE;
    const g = sprite.getContext('2d');
    if (g) {
      const c = SPRITE_SIZE / 2;
      const gradient = g.createRadialGradient(c, c, 0, c, c, c);
      for (const [stop, share] of FALLOFF) gradient.addColorStop(stop, withAlpha(color, share));
      g.fillStyle = gradient;
      g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
    sprites.set(color, sprite);
  }
  return sprite;
}

/**
 * Paints the lights as radial glows, adding up where they overlap. `toScreen` maps a cell
 * corner to screen pixels; `strength` scales every light.
 */
export function paintLights(
  g: CanvasRenderingContext2D,
  lights: readonly Light[],
  cellSize: number,
  toScreen: (x: number, y: number) => readonly [number, number],
  strength: number,
): void {
  const { a, b } = g.getTransform();
  const pixelScale = Math.hypot(a, b);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.imageSmoothingEnabled = true;
  for (const light of lights) {
    const [cx, cy] = toScreen(light.x + 0.5, light.y + 0.5);
    const r = light.radius * cellSize;
    g.globalAlpha = Math.min(1, light.strength * strength);
    // A mipmap near the drawn size: shrinking the full sprite every time would be slow.
    const { image } = textureForSize(glowSprite(light.color), r * 2 * pixelScale);
    g.drawImage(image, cx - r, cy - r, r * 2, r * 2);
  }
  g.restore();
}

/** `#rrggbb` with an alpha, as an rgba() colour. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
