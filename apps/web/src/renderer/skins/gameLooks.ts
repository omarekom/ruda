import { depthSkin } from './depth';
import { meadowSkin } from './meadow';
import { pixelSkin } from './pixel';
import type { Skin } from './skin';
import { workshopSkin } from './workshop';

/** Game mode's block looks the player can pick from. */
export const GAME_LOOKS = {
  original: pixelSkin,
  meadow: meadowSkin,
  workshop: workshopSkin,
  depth: depthSkin,
} as const satisfies Record<string, Skin>;

export type GameLook = keyof typeof GAME_LOOKS;

export const GAME_LOOK_NAMES = Object.keys(GAME_LOOKS) as readonly GameLook[];
