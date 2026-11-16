export type RudaFileErrorCode =
  /** Not valid JSON. */
  | 'invalid_json'
  /** JSON, but not a Ruda world. */
  | 'not_ruda'
  /** Written by a newer version of Ruda. */
  | 'too_new'
  /** A Ruda world with broken content (unknown block, bad coordinates, …). */
  | 'invalid_content';

/** A file that cannot be loaded; `code` lets the app show a translated message. */
export class RudaFileError extends Error {
  constructor(
    readonly code: RudaFileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RudaFileError';
  }
}
