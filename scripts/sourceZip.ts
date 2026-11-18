import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

/** The version shown in the app and used in the archive name: "1.0", or "1.0.1" for a bugfix release. */
export function displayVersion(): string {
  const manifest: { version: string } = JSON.parse(
    readFileSync(join(ROOT, 'apps/web/package.json'), 'utf8'),
  );
  const [major, minor, patch] = manifest.version.split('.');
  return patch === '0' ? `${major}.${minor}` : manifest.version;
}

export function sourceArchiveName(): string {
  return `ruda_v${displayVersion()}.zip`;
}

/** The last commit as a zip; uncommitted changes are not included. */
export function createSourceArchive(): Buffer {
  return execFileSync('git', ['archive', '--format=zip', '--prefix=ruda/', 'HEAD'], {
    cwd: ROOT,
    maxBuffer: 256 * 1024 * 1024,
  });
}

// Usage: node scripts/sourceZip.ts [output directory]
if (import.meta.main) {
  const target = join(resolve(process.argv[2] ?? '.'), sourceArchiveName());
  writeFileSync(target, createSourceArchive());
  console.log(`Wrote ${target}`);
}
