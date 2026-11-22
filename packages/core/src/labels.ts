/** The longest label, in characters. */
export const MAX_LABEL_LENGTH = 80;

/**
 * Whether the text can be a label: one line of 1 to MAX_LABEL_LENGTH characters, without
 * control characters or spaces at either end.
 */
export function isValidLabel(text: string): boolean {
  const length = [...text].length;
  return length > 0 && length <= MAX_LABEL_LENGTH && text === text.trim() && !/\p{Cc}/u.test(text);
}
