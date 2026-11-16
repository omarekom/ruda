import { describe, expect, it } from 'vitest';
import { Camera, MAX_CELL_SIZE } from '../src/renderer/camera';

function camera(): Camera {
  const result = new Camera();
  result.resize(800, 600);
  return result;
}

describe('Camera', () => {
  it('round-trips screen and world coordinates', () => {
    const cam = camera();
    cam.panBy(123, -45);
    const [wx, wy] = cam.screenToWorld(10, 20);
    expect(cam.worldToScreen(wx, wy)).toEqual([10, 20]);
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const cam = camera();
    const before = cam.screenToWorld(100, 500);
    cam.zoomAt(100, 500, 1.7);
    const after = cam.screenToWorld(100, 500);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
  });

  it('clamps the zoom level', () => {
    const cam = camera();
    cam.zoomAt(0, 0, 1000);
    expect(cam.cellSize).toBe(MAX_CELL_SIZE);
  });

  it('reports the visible cells', () => {
    const rect = camera().visibleCells();
    expect(rect.maxX - rect.minX + 1).toBeGreaterThanOrEqual(800 / 32);
    expect(rect.maxY - rect.minY + 1).toBeGreaterThanOrEqual(600 / 32);
  });
});
