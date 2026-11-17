import { grassFloor, PALETTE } from './blockTextures';
import { drawFromTable, type Skin } from './skin';
import { texturedLooks, tiledFloor } from './textured';

const LOOKS = texturedLooks((g, size, top) => top(g, size));

/** Game look, iteration A: Minecraft-like textures seen straight from above, on grass. */
export const meadowSkin: Skin = {
  background: '#5d9b3a',
  grid: 'rgba(0, 0, 0, 0.07)',
  hover: 'rgba(255, 255, 255, 0.8)',
  ink: PALETTE.stone[0],
  dark: true,
  light: { lamp: '#ffd75e', power: '#ff3b2f' },
  drawBlock: (g, block, size, appearance, seed) =>
    drawFromTable(LOOKS, g, block, size, appearance, seed),
  drawFloor: tiledFloor(grassFloor, '#5d9b3a'),
};
