import { Simulation, type World } from '@ruda/core';
import { drawBlock } from './looks';
import { appearanceOf } from './renderer';

const BACKGROUND = '#1d1f24';
const MAX_CELL_SIZE = 24;
const PADDING_CELLS = 1;

/** Draws the whole world scaled to fit the canvas, centred. */
export function drawWorldPreview(canvas: HTMLCanvasElement, world: World): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  g.fillStyle = BACKGROUND;
  g.fillRect(0, 0, width, height);

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
  if (minX > maxX) return;

  const columns = maxX - minX + 1 + 2 * PADDING_CELLS;
  const rows = maxY - minY + 1 + 2 * PADDING_CELLS;
  const size = Math.min(width / columns, height / rows, MAX_CELL_SIZE);
  const originX = (width - (maxX - minX + 1) * size) / 2;
  const originY = (height - (maxY - minY + 1) * size) / 2;
  // The simulation derives power, so lit lamps and powered wires show as they will in the game.
  const simulation = new Simulation(world);
  world.forEach((x, y, block) => {
    g.save();
    g.translate(originX + (x - minX) * size, originY + (y - minY) * size);
    drawBlock(g, block, size, appearanceOf(simulation, x, y));
    g.restore();
  });
}
