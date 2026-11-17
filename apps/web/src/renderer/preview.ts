import { Simulation, type World } from '@ruda/core';
import { appearanceOf, cellSeed } from './renderer';
import { paintFloor, type Skin } from './skins/skin';

const MAX_CELL_SIZE = 24;
const PADDING_CELLS = 1;

/** Draws the whole world scaled to fit the canvas, centred. */
export function drawWorldPreview(canvas: HTMLCanvasElement, world: World, skin: Skin): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  g.setTransform(ratio, 0, 0, ratio, 0, 0);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  world.forEach((x, y) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  if (minX > maxX) {
    paintFloor(g, skin, MAX_CELL_SIZE, [width / 2, height / 2], width, height);
    return;
  }

  const columns = maxX - minX + 1 + 2 * PADDING_CELLS;
  const rows = maxY - minY + 1 + 2 * PADDING_CELLS;
  const size = Math.min(width / columns, height / rows, MAX_CELL_SIZE);
  const originX = (width - (maxX - minX + 1) * size) / 2;
  const originY = (height - (maxY - minY + 1) * size) / 2;
  paintFloor(g, skin, size, [originX - minX * size, originY - minY * size], width, height);
  // The simulation derives power, so lit lamps and powered wires show as they will in the game.
  const simulation = new Simulation(world);
  world.forEach((x, y, block) => {
    g.save();
    g.translate(originX + (x - minX) * size, originY + (y - minY) * size);
    skin.drawBlock(g, block, size, appearanceOf(simulation, x, y), cellSeed(x, y));
    g.restore();
  });
}
