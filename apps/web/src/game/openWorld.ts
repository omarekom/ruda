import type { World } from '@ruda/core';

/** A world loaded from storage and ready for the editor. */
export interface OpenWorld {
  readonly id: string;
  readonly name: string;
  readonly world: World;
  /** Whether the world comes from a recovery copy, i.e. starts with unsaved changes. */
  readonly restored: boolean;
}
