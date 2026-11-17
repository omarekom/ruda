import { serializeWorld } from '@ruda/core';
import { CREATIONS } from './catalog';

export const SEED_AUTHOR = 'Ruda';

export interface SeedEntry {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly author: string;
  /** The world as `.ruda` text. */
  readonly data: string;
}

/** The built-in creations as library entries, in library order. */
export function seedEntries(): SeedEntry[] {
  return CREATIONS.map((creation) => ({
    slug: creation.slug,
    title: creation.title,
    description: creation.description,
    author: SEED_AUTHOR,
    data: serializeWorld(creation.build().world, creation.title),
  }));
}
