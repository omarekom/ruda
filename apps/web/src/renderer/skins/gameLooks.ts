import type { Skin } from './skin';
import { WORKSHOP_LOOKS } from './workshop';

/** Game mode's block looks the player can pick from. */
export const GAME_LOOKS: Readonly<Record<keyof typeof WORKSHOP_LOOKS, Skin>> = WORKSHOP_LOOKS;

export type GameLook = keyof typeof GAME_LOOKS;

export const GAME_LOOK_NAMES = Object.keys(GAME_LOOKS) as readonly GameLook[];
