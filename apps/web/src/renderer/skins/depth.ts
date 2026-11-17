import { deepslateFloor, PALETTE } from './blockTextures';
import { drawFromTable, type Skin } from './skin';
import { isSolid, texturedLooks, tiledFloor } from './textured';
import { TEXTURE_SIZE } from './texture';

/** Share of the cell taken by a solid block's top; the rest shows its south side. */
const TOP = 0.75;
/** Rows of the side texture shown on the south side. */
const SIDE_ROWS = 4;

/**
 * Solid blocks seen at an angle: the top squashed into the upper part of the cell, and the
 * bottom rows of the side texture, darkened, as the south face below it.
 */
const LOOKS = texturedLooks((g, size, top, side) => {
  g.save();
  g.scale(1, TOP);
  top(g, size);
  g.restore();
  g.imageSmoothingEnabled = false;
  const sideTop = size * TOP;
  g.drawImage(
    side,
    0,
    TEXTURE_SIZE - SIDE_ROWS,
    TEXTURE_SIZE,
    SIDE_ROWS,
    0,
    sideTop,
    size,
    size - sideTop,
  );
  g.fillStyle = 'rgba(0, 0, 0, 0.45)';
  g.fillRect(0, sideTop, size, size - sideTop);
  g.fillStyle = 'rgba(255, 255, 255, 0.18)';
  g.fillRect(0, 0, size, Math.max(1, size / 16));
});

/** Game look, iteration C: a dark deepslate cave where solid blocks stand up with height. */
export const depthSkin: Skin = {
  background: '#3a3a40',
  grid: 'rgba(0, 0, 0, 0)',
  hover: 'rgba(255, 255, 255, 0.7)',
  ink: PALETTE.stone[0],
  dark: true,
  light: { lamp: '#ffcf5a', power: '#ff3b2f' },
  drawBlock: (g, block, size, appearance, seed) =>
    drawFromTable(LOOKS, g, block, size, appearance, seed),
  drawFloor: tiledFloor(deepslateFloor, '#3a3a40'),
  drawUnder: (g, block, size) => {
    if (!isSolid(block)) return;
    // A soft shadow cast onto the floor south of the block.
    g.fillStyle = 'rgba(0, 0, 0, 0.35)';
    g.fillRect(size * 0.06, size, size * 0.94, size * 0.3);
  },
};
