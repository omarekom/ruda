// Writes the built-in creations to the library server's seed file.
import { writeFileSync } from 'node:fs';
import { seedEntries } from '../src/seed';
import { SEED_FILE } from './seedFile';

writeFileSync(SEED_FILE, `${JSON.stringify(seedEntries(), null, 2)}\n`);
console.log(`Wrote ${SEED_FILE}`);
