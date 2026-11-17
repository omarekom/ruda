/** The outcome of the latest save, for showing a short confirmation. */
export interface SaveResult {
  readonly ok: boolean;
  /** When the save finished (ms since epoch); distinguishes repeated saves. */
  readonly at: number;
}
