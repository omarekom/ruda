import { World } from '@ruda/core';
import { CREATIONS } from '@ruda/creations';

/** Empty cells between creations. */
const GAP = 4;
/** A row of creations wraps once it is this many cells wide. */
const ROW_WIDTH = 80;

/**
 * Every built-in creation laid out side by side in one world, in rows. Temporary: it lets
 * the block looks being tuned be seen on real, running circuits.
 */
export function showcaseWorld(): World {
  const showcase = new World();
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const creation of CREATIONS) {
    const { world } = creation.build();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    world.forEach((bx, by) => {
      minX = Math.min(minX, bx);
      minY = Math.min(minY, by);
      maxX = Math.max(maxX, bx);
      maxY = Math.max(maxY, by);
    });
    if (minX > maxX) continue;
    const width = maxX - minX + 1;
    if (x > 0 && x + width > ROW_WIDTH) {
      x = 0;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    const dx = x - minX;
    const dy = y - minY;
    world.forEach((bx, by, block) => showcase.set(bx + dx, by + dy, block));
    x += width + GAP;
    rowHeight = Math.max(rowHeight, maxY - minY + 1);
  }
  return showcase;
}
