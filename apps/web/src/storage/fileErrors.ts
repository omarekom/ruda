import { RudaFileError } from '@ruda/core';

/** The i18n key describing why a world file could not be loaded. */
export function fileErrorKey(error: unknown): string {
  const code = error instanceof RudaFileError ? error.code : 'invalid_content';
  return `fileErrors.${code}`;
}
