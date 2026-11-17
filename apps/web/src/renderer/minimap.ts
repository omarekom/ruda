import { WORLD_MAX, WORLD_MIN, type Block, type ReadonlyWorld } from '@ruda/core';
import type { Camera } from './camera';
import type { Skin } from './skins/skin';

/** Pixels per cell on the minimap. */
export const MINIMAP_SCALE = 3;

function colorOf(block: Block, skin: Skin): string {
  switch (block.type) {
    case 'lamp':
      return skin.light.lamp;
    case 'stone':
    case 'piston':
    case 'piston_head':
      return skin.ink;
    default:
      return skin.light.power;
  }
}

/** Draws the blocks around the camera at a fixed small scale, with the visible area outlined. */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  world: ReadonlyWorld,
  camera: Camera,
  skin: Skin,
): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  g.clearRect(0, 0, width, height);

  const [centerX, centerY] = camera.center;
  const toX = (x: number): number => width / 2 + (x - centerX) * MINIMAP_SCALE;
  const toY = (y: number): number => height / 2 + (y - centerY) * MINIMAP_SCALE;
  const halfW = width / 2 / MINIMAP_SCALE;
  const halfH = height / 2 / MINIMAP_SCALE;
  world.forEachInRect(
    Math.max(WORLD_MIN, Math.floor(centerX - halfW)),
    Math.max(WORLD_MIN, Math.floor(centerY - halfH)),
    Math.min(WORLD_MAX - 1, Math.ceil(centerX + halfW)),
    Math.min(WORLD_MAX - 1, Math.ceil(centerY + halfH)),
    (x, y, block) => {
      // Inert blocks are drawn faint so circuits stand out.
      const color = colorOf(block, skin);
      g.globalAlpha = color === skin.ink ? 0.4 : 1;
      g.fillStyle = color;
      g.fillRect(toX(x), toY(y), MINIMAP_SCALE, MINIMAP_SCALE);
    },
  );

  g.globalAlpha = 1;
  const view = camera.visibleCells();
  g.strokeStyle = skin.ink;
  g.lineWidth = 1;
  g.strokeRect(
    Math.round(toX(view.minX)) + 0.5,
    Math.round(toY(view.minY)) + 0.5,
    (view.maxX - view.minX + 1) * MINIMAP_SCALE,
    (view.maxY - view.minY + 1) * MINIMAP_SCALE,
  );
}

/** The world point under a click on the minimap. */
export function minimapToWorld(
  canvas: HTMLCanvasElement,
  camera: Camera,
  px: number,
  py: number,
): [number, number] {
  const [centerX, centerY] = camera.center;
  return [
    centerX + (px - canvas.clientWidth / 2) / MINIMAP_SCALE,
    centerY + (py - canvas.clientHeight / 2) / MINIMAP_SCALE,
  ];
}
