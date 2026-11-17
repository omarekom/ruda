import { CREATIONS } from '@ruda/creations';
import { describe, expect, it } from 'vitest';
import { showcaseWorld } from '../src/game/showcase';

describe('showcaseWorld', () => {
  it('holds every block of every built-in creation', () => {
    const total = CREATIONS.reduce((sum, creation) => sum + creation.build().world.blockCount, 0);
    expect(showcaseWorld().blockCount).toBe(total);
  });
});
