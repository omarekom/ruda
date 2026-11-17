import { PALETTE, smoothFloor } from './blockTextures';
import { drawFromTable, type Skin } from './skin';
import { isSolid, texturedLooks, tiledFloor } from './textured';

/** Share of the cell a solid block's shadow is offset by, towards the bottom right. */
const SHADOW_OFFSET = 0.12;

/**
 * Solid blocks get a bevel like an inventory icon: light along the top and left edge,
 * dark along the bottom and right.
 */
const LOOKS = texturedLooks((g, size, top) => {
  top(g, size);
  const edge = Math.max(1, size / 16);
  g.fillStyle = 'rgba(255, 255, 255, 0.28)';
  g.fillRect(0, 0, size, edge);
  g.fillRect(0, edge, edge, size - edge);
  g.fillStyle = 'rgba(0, 0, 0, 0.32)';
  g.fillRect(edge, size - edge, size - edge, edge);
  g.fillRect(size - edge, edge, edge, size - 2 * edge);
});

/** Game look, iteration B: a bright workshop of smooth stone slabs; solid blocks cast shadows. */
export const workshopSkin: Skin = {
  background: '#c6c6c6',
  grid: 'rgba(0, 0, 0, 0)',
  hover: 'rgba(0, 0, 0, 0.6)',
  ink: PALETTE.stone[0],
  dark: false,
  light: { lamp: '#ffc53d', power: '#ff3b2f' },
  drawBlock: (g, block, size, appearance, seed) =>
    drawFromTable(LOOKS, g, block, size, appearance, seed),
  drawFloor: tiledFloor(smoothFloor, '#c6c6c6'),
  drawUnder: (g, block, size) => {
    if (!isSolid(block)) return;
    const offset = size * SHADOW_OFFSET;
    g.fillStyle = 'rgba(0, 0, 0, 0.25)';
    g.fillRect(offset, offset, size, size);
  },
};
