import { RudaFileError } from './errors';

export type JsonObject = { readonly [key: string]: unknown };

/** Converts a file of version N to version N + 1. */
export type Migration = (file: JsonObject) => JsonObject;

/**
 * `MIGRATIONS[i]` migrates version `i + 1` to `i + 2`. Append new migrations; never edit old ones.
 * Empty while version 1 is the only one: the app has not been released yet.
 */
export const MIGRATIONS: readonly Migration[] = [];

export const CURRENT_VERSION = MIGRATIONS.length + 1;

/** Runs the migration chain from the file's version up to the latest one. */
export function migrate(
  file: JsonObject,
  migrations: readonly Migration[] = MIGRATIONS,
): JsonObject {
  const latest = migrations.length + 1;
  const { rudaversion: version } = file;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new RudaFileError('not_ruda', 'Missing or invalid "rudaversion" field');
  }
  if (version > latest) {
    throw new RudaFileError('too_new', `Version ${version} is newer than supported ${latest}`);
  }
  let current = file;
  for (let v = version; v < latest; v++) {
    const migration = migrations[v - 1];
    if (!migration) throw new Error(`Missing migration from version ${v}`);
    current = { ...migration(current), rudaversion: v + 1 };
  }
  return current;
}
