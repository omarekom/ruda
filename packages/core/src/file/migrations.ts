import { RudaFileError } from './errors';

export type JsonObject = { readonly [key: string]: unknown };

/** Converts a file of format N to format N + 1. */
export type Migration = (file: JsonObject) => JsonObject;

/** `MIGRATIONS[i]` migrates format `i + 1` to `i + 2`. Append new migrations; never edit old ones. */
export const MIGRATIONS: readonly Migration[] = [
  // 1 → 2: adds the delayer and button blocks; existing content is unchanged.
  (file) => file,
  // 2 → 3: adds the piston and piston head blocks; existing content is unchanged.
  (file) => file,
  // 3 → 4: the constant power source was renamed from its old name to `power_block`.
  renameBlock('redstone_block', 'power_block'),
];

/** Renames a stateless block type in the `blocks` table; anything else is left for validation. */
function renameBlock(from: string, to: string): Migration {
  return (file) => {
    const { blocks } = file;
    if (typeof blocks !== 'object' || blocks === null || Array.isArray(blocks)) return file;
    const table = blocks as JsonObject;
    if (!(from in table)) return file;
    const { [from]: cells, ...rest } = table;
    return { ...file, blocks: { ...rest, [to]: cells } };
  };
}

export const CURRENT_FORMAT = MIGRATIONS.length + 1;

/** Runs the migration chain from the file's format up to the latest one. */
export function migrate(
  file: JsonObject,
  migrations: readonly Migration[] = MIGRATIONS,
): JsonObject {
  const latest = migrations.length + 1;
  const { format } = file;
  if (typeof format !== 'number' || !Number.isInteger(format) || format < 1) {
    throw new RudaFileError('not_ruda', 'Missing or invalid "format" field');
  }
  if (format > latest) {
    throw new RudaFileError('too_new', `Format ${format} is newer than supported ${latest}`);
  }
  let current = file;
  for (let version = format; version < latest; version++) {
    const migration = migrations[version - 1];
    if (!migration) throw new Error(`Missing migration from format ${version}`);
    current = { ...migration(current), format: version + 1 };
  }
  return current;
}
