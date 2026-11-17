import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SEED_FILE } from '../scripts/seedFile';
import { seedEntries } from '../src/seed';

describe('library seed file', () => {
  it('matches the creations (run `pnpm --filter @ruda/creations export-seed` after changes)', () => {
    expect(JSON.parse(readFileSync(SEED_FILE, 'utf8'))).toEqual(seedEntries());
  });
});
