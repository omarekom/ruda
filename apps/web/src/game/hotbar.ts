import {
  BUTTON_TICKS,
  createBlock,
  Direction,
  isRotatable,
  rotateClockwise,
  type Block,
  type BlockType,
} from '@ruda/core';

/** In the order a signal flows through a circuit: inputs, wiring, logic, outputs, building. */
export const HOTBAR_SLOTS: readonly BlockType[] = [
  'lever',
  'button',
  'power_block',
  'wire',
  'crossing',
  'torch',
  'delayer',
  'lamp',
  'piston',
  'stone',
];

/** The number key that selects a slot: 1–9, then 0 for the tenth. */
export function slotKey(index: number): string {
  return String((index + 1) % 10);
}

export function slotForKey(digit: number): number {
  return digit === 0 ? 9 : digit - 1;
}

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

/**
 * How a slot's block is shown in the hotbar: switched on, so its red stands out on the dark
 * slot. Pistons stay retracted, as an extended one would need its head beside it.
 */
export function hotbarIcon(type: BlockType, facing: Direction): Block {
  const block = createBlock(type, facing);
  switch (block.type) {
    case 'lever':
      return { ...block, on: true };
    case 'torch':
      return { ...block, lit: true };
    case 'button':
      return { ...block, remaining: BUTTON_TICKS };
    case 'delayer':
      return { ...block, line: block.line.map(() => true) };
    default:
      return block;
  }
}

export function selectSlot(state: HotbarState, index: number): void {
  if (index >= 0 && index < HOTBAR_SLOTS.length) state.selected = index;
}

export function rotateHeld(state: HotbarState): void {
  if (isRotatable(selectedType(state))) state.facing = rotateClockwise(state.facing);
}
