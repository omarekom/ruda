import {
  createBlock,
  Direction,
  isRotatable,
  rotateClockwise,
  type Block,
  type BlockType,
} from '@ruda/core';

export const HOTBAR_SLOTS: readonly BlockType[] = [
  'redstone_block',
  'lever',
  'wire',
  'crossing',
  'lamp',
  'torch',
  'stone',
  'delayer',
  'button',
];

/** UI state of the hotbar; shared by the Vue panel and the canvas input handlers. */
export interface HotbarState {
  selected: number;
  facing: Direction;
}

export function createHotbarState(): HotbarState {
  return { selected: 0, facing: Direction.North };
}

export function selectedType(state: HotbarState): BlockType {
  return HOTBAR_SLOTS[state.selected] ?? 'stone';
}

export function heldBlock(state: HotbarState): Block {
  return createBlock(selectedType(state), state.facing);
}

export function selectSlot(state: HotbarState, index: number): void {
  if (index >= 0 && index < HOTBAR_SLOTS.length) state.selected = index;
}

export function rotateHeld(state: HotbarState): void {
  if (isRotatable(selectedType(state))) state.facing = rotateClockwise(state.facing);
}
