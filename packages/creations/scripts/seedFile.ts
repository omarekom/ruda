import { fileURLToPath } from 'node:url';

export const SEED_FILE = fileURLToPath(
  new URL('../../../apps/library-api/seed/creations.json', import.meta.url),
);
