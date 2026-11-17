import { Axis, type Block, type Direction } from '@ruda/core';
import {
  buttonTexture,
  cobbleTexture,
  crossingTexture,
  delayerLineKey,
  delayerTexture,
  dustArmTexture,
  dustCenterTexture,
  lampTexture,
  leverTexture,
  pistonHeadTexture,
  pistonTexture,
  powerBlockTexture,
  stoneTexture,
  torchTexture,
  VARIANTS,
} from './blockTextures';
import { faceToward, wireArms } from './shapes';
import type { Look, LookTable, Skin } from './skin';
import { averagePixel, deviceScale, drawTexture, TEXTURE_SIZE, textureForSize } from './texture';

/** Draws one face of a block over the square (0, 0)–(size, size). */
export type Face = (g: CanvasRenderingContext2D, size: number) => void;

/**
 * How a skin presents blocks that stand up from the floor (stone, power blocks, lamps,
 * pistons): flat from straight above, or with some sense of height. `side` is a texture whose
 * look suits the block's sides.
 */
export type DrawSolid = (
  g: CanvasRenderingContext2D,
  size: number,
  top: Face,
  side: HTMLCanvasElement,
) => void;

const SOLID_TYPES: ReadonlySet<Block['type']> = new Set(['stone', 'power_block', 'lamp', 'piston']);

export function isSolid(block: Block): boolean {
  return SOLID_TYPES.has(block.type);
}

const variantOf = (seed: number): number => (seed >>> 0) % VARIANTS;

const plain =
  (texture: HTMLCanvasElement): Face =>
  (g, s) =>
    drawTexture(g, texture, s);

/** Draws a north-facing texture turned towards `facing`. */
function facingTexture(
  g: CanvasRenderingContext2D,
  texture: HTMLCanvasElement,
  facing: Direction,
  s: number,
): void {
  g.save();
  faceToward(g, facing, s);
  drawTexture(g, texture, s);
  g.restore();
}

/** Block looks built from the shared 16×16 textures; skins choose how solid blocks stand. */
export function texturedLooks(drawSolid: DrawSolid): LookTable {
  const wire: Look<'wire'> = (g, _block, s, { attached, powered }) => {
    const on = powered[Axis.Horizontal] ?? false;
    const arms = wireArms(attached);
    const arm = dustArmTexture(`${on}-${arms.length < 0.5 ? 'short' : 'full'}`);
    for (const side of arms.sides) facingTexture(g, arm, side, s);
    drawTexture(g, dustCenterTexture(on), s);
  };

  return {
    stone: (g, _block, s, _appearance, seed) => {
      const texture = stoneTexture(variantOf(seed));
      drawSolid(g, s, plain(texture), texture);
    },
    power_block: (g, _block, s, _appearance, seed) => {
      const texture = powerBlockTexture(variantOf(seed));
      drawSolid(g, s, plain(texture), texture);
    },
    lamp: (g, _block, s, { lit }) => {
      const texture = lampTexture(lit);
      drawSolid(g, s, plain(texture), texture);
    },
    piston: (g, block, s, _appearance, seed) => {
      const top: Face = (tg, ts) =>
        facingTexture(tg, pistonTexture(block.extended), block.facing, ts);
      drawSolid(g, s, top, cobbleTexture(variantOf(seed)));
    },
    piston_head: (g, block, s) => facingTexture(g, pistonHeadTexture(), block.facing, s),
    wire,
    crossing: (g, _block, s, { powered }) => {
      const horizontal = powered[Axis.Horizontal] ?? false;
      const vertical = powered[Axis.Vertical] ?? false;
      drawTexture(g, crossingTexture(`${horizontal}-${vertical}`), s);
    },
    lever: (g, block, s) => drawTexture(g, leverTexture(block.on), s),
    torch: (g, block, s) => facingTexture(g, torchTexture(block.lit), block.facing, s),
    delayer: (g, block, s) =>
      facingTexture(g, delayerTexture(delayerLineKey(block.line)), block.facing, s),
    button: (g, block, s) => drawTexture(g, buttonTexture(block.remaining > 0), s),
  };
}

/**
 * Between these cell sizes (in device pixels) the floor's slab pattern fades into its average
 * colour, so far out the floor is plain instead of a fine grid.
 */
const FLOOR_DETAIL_FULL_PX = 18;
const FLOOR_DETAIL_GONE_PX = 6;

/** A `drawFloor` that repeats a floor tile, aligned with the world's cells. */
export function tiledFloor(
  tile: () => HTMLCanvasElement,
  background: string,
): NonNullable<Skin['drawFloor']> {
  return (g, cellSize, [ox, oy], width, height) => {
    const texture = tile();
    const scale = deviceScale(g);
    const tileSize = (cellSize * texture.width) / TEXTURE_SIZE;
    const { image, next } = textureForSize(texture, tileSize * scale);
    g.imageSmoothingEnabled = true;
    fillWithTile(g, image, tileSize, ox, oy, width, height, background);
    // Blending towards the next mipmap level keeps the floor from popping as levels change.
    if (next) {
      g.globalAlpha = next.weight;
      fillWithTile(g, next.image, tileSize, ox, oy, width, height, background);
      g.globalAlpha = 1;
    }

    const plain =
      (FLOOR_DETAIL_FULL_PX - cellSize * scale) / (FLOOR_DETAIL_FULL_PX - FLOOR_DETAIL_GONE_PX);
    if (plain <= 0) return;
    g.globalAlpha = Math.min(1, plain);
    g.drawImage(averagePixel(texture), 0, 0, width, height);
    g.globalAlpha = 1;
  };
}

function fillWithTile(
  g: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  tileSize: number,
  ox: number,
  oy: number,
  width: number,
  height: number,
  background: string,
): void {
  const pattern = g.createPattern(image, 'repeat');
  pattern?.setTransform(new DOMMatrix().translate(ox, oy).scale(tileSize / image.width));
  g.fillStyle = pattern ?? background;
  g.fillRect(0, 0, width, height);
}
