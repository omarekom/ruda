/** A short message flashed at the top of the game, e.g. after saving or undoing. */
export interface Notice {
  /** i18n key of the message. */
  readonly key: string;
  /** Values for the message's placeholders. */
  readonly values?: Readonly<Record<string, number>>;
  /** A warning tells the player something did not happen, such as a failed save. */
  readonly warning?: boolean;
  /** When it was raised (ms since epoch); distinguishes repeated notices. */
  readonly at: number;
}
