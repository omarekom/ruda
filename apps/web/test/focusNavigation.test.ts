import { describe, expect, it } from 'vitest';
import { nearestInDirection, type Box } from '../src/input/focusNavigation';

const box = (left: number, top: number): Box => ({ left, top, width: 100, height: 40 });

// A menu like the pause menu: one wide button, then two rows of two, then one wide button.
const wide = (top: number): Box => ({ left: 0, top, width: 210, height: 40 });
const MENU: readonly Box[] = [
  wide(0),
  box(0, 50),
  box(110, 50),
  box(0, 100),
  box(110, 100),
  wide(150),
];

function from(index: number): Box {
  const found = MENU[index];
  if (!found) throw new Error(`No menu item ${index}`);
  return found;
}

describe('nearestInDirection', () => {
  it('moves down a column and across a row', () => {
    expect(nearestInDirection(from(1), MENU, 'ArrowDown')).toBe(3);
    expect(nearestInDirection(from(2), MENU, 'ArrowDown')).toBe(4);
    expect(nearestInDirection(from(1), MENU, 'ArrowRight')).toBe(2);
    expect(nearestInDirection(from(4), MENU, 'ArrowLeft')).toBe(3);
  });

  it('reaches wide buttons from either column', () => {
    expect(nearestInDirection(from(3), MENU, 'ArrowDown')).toBe(5);
    expect(nearestInDirection(from(4), MENU, 'ArrowDown')).toBe(5);
    expect(nearestInDirection(from(2), MENU, 'ArrowUp')).toBe(0);
  });

  it('goes from a wide button to the nearest row below', () => {
    expect(nearestInDirection(from(0), MENU, 'ArrowDown')).toBe(1);
  });

  it('stops at the edge', () => {
    expect(nearestInDirection(from(0), MENU, 'ArrowUp')).toBeUndefined();
    expect(nearestInDirection(from(2), MENU, 'ArrowRight')).toBeUndefined();
  });
});
