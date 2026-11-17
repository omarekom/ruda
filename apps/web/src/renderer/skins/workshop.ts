import { nightSlabFloor, PALETTE, slabFloor } from './blockTextures';
import { drawFromTable, type Skin } from './skin';
import { isSolid, texturedLooks, tiledFloor } from './textured';

/** Solid blocks' shadow towards the bottom right, as a share of the cell. */
const SHADOW_OFFSET = 0.1;

/**
 * Solid blocks get a dark pixel outline and, inside it, a bevel like an inventory icon:
 * light along the top and left edge, dark along the bottom and right. Both are one texel wide,
 * so they are painted into the texture and scale (and fade when zoomed out) with it.
 */
const LOOKS = texturedLooks((top) => {
  const n = top.width;
  const image = document.createElement('canvas');
  image.width = n;
  image.height = top.height;
  const g = image.getContext('2d');
  if (!g) return top;
  g.drawImage(top, 0, 0);
  g.fillStyle = 'rgba(0, 0, 0, 0.6)';
  g.fillRect(0, 0, n, 1);
  g.fillRect(0, n - 1, n, 1);
  g.fillRect(0, 1, 1, n - 2);
  g.fillRect(n - 1, 1, 1, n - 2);
  g.fillStyle = 'rgba(255, 255, 255, 0.28)';
  g.fillRect(1, 1, n - 2, 1);
  g.fillRect(1, 2, 1, n - 3);
  g.fillStyle = 'rgba(0, 0, 0, 0.32)';
  g.fillRect(2, n - 2, n - 3, 1);
  g.fillRect(n - 2, 2, 1, n - 4);
  return image;
});

function solidShadow(alpha: number): NonNullable<Skin['drawUnder']> {
  return (g, block, size) => {
    if (!isSolid(block)) return;
    g.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    g.fillRect(size * SHADOW_OFFSET, size * SHADOW_OFFSET, size, size);
  };
}

const LIGHT = { lamp: '#ffc53d', power: '#ff2a1a' } as const;

const drawBlock: Skin['drawBlock'] = (g, block, size, appearance, seed) =>
  drawFromTable(LOOKS, g, block, size, appearance, seed);

/**
 * The game's look: Minecraft-like textures from straight above on a bright, warm floor of
 * smooth stone slabs, with solid blocks casting shadows.
 */
export const workshopSkin: Skin = {
  background: '#d2ccc0',
  grid: 'rgba(0, 0, 0, 0)',
  hover: 'rgba(0, 0, 0, 0.6)',
  ink: PALETTE.stone[0],
  // Overlay makes light glow on the pale floor instead of just staining it.
  glow: { mode: 'overlay', strength: 2.5, overBlocks: 0 },
  light: LIGHT,
  drawBlock,
  drawFloor: tiledFloor(slabFloor, '#d2ccc0'),
  drawUnder: solidShadow(0.3),
};

/** The same blocks on the slabs at night; light adds up on the dark floor. */
export const workshopNightSkin: Skin = {
  background: '#2a2c31',
  grid: 'rgba(0, 0, 0, 0)',
  hover: 'rgba(255, 255, 255, 0.7)',
  ink: PALETTE.stone[0],
  glow: { mode: 'lighter', strength: 0.9, overBlocks: 0.15 },
  light: LIGHT,
  drawBlock,
  drawFloor: tiledFloor(nightSlabFloor, '#2a2c31'),
  drawUnder: solidShadow(0.45),
};
