import { PALETTE, slabFloor } from './blockTextures';
import { drawFromTable, type Skin } from './skin';
import { isSolid, texturedLooks, tiledFloor } from './textured';

/** Solid blocks' shadow towards the bottom right, as a share of the cell. */
const SHADOW_OFFSET = 0.1;

/**
 * Solid blocks get a dark pixel outline and, inside it, a bevel like an inventory icon:
 * light along the top and left edge, dark along the bottom and right.
 */
const LOOKS = texturedLooks((g, size, top) => {
  top(g, size);
  const px = Math.max(1, size / 16);
  g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  g.lineWidth = px;
  g.strokeRect(px / 2, px / 2, size - px, size - px);
  const inner = size - 2 * px;
  g.fillStyle = 'rgba(255, 255, 255, 0.28)';
  g.fillRect(px, px, inner, px);
  g.fillRect(px, 2 * px, px, inner - px);
  g.fillStyle = 'rgba(0, 0, 0, 0.32)';
  g.fillRect(2 * px, px + inner - px, inner - px, px);
  g.fillRect(px + inner - px, 2 * px, px, inner - 2 * px);
});

/**
 * Game mode's look: Minecraft-like textures from straight above on a bright, warm floor of
 * smooth stone slabs, with solid blocks casting shadows.
 */
export const workshopSkin: Skin = {
  background: '#d2ccc0',
  grid: 'rgba(0, 0, 0, 0)',
  hover: 'rgba(0, 0, 0, 0.6)',
  ink: PALETTE.stone[0],
  // Overlay makes light glow on the pale floor instead of just staining it.
  glow: { mode: 'overlay', strength: 2.5, overBlocks: 0 },
  light: { lamp: '#ffc53d', power: '#ff2a1a' },
  drawBlock: (g, block, size, appearance, seed) =>
    drawFromTable(LOOKS, g, block, size, appearance, seed),
  drawFloor: tiledFloor(slabFloor, '#d2ccc0'),
  drawUnder: (g, block, size) => {
    if (!isSolid(block)) return;
    g.fillStyle = 'rgba(0, 0, 0, 0.3)';
    g.fillRect(size * SHADOW_OFFSET, size * SHADOW_OFFSET, size, size);
  },
};
