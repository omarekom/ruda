const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** How long ago something happened, in the largest unit that reads naturally. */
export type RelativeTime =
  | { readonly kind: 'justNow' }
  | { readonly kind: 'ago'; readonly value: number; readonly unit: Intl.RelativeTimeFormatUnit };

export function relativeTime(then: number, now: number): RelativeTime {
  const elapsed = Math.max(0, now - then);
  const ago = (value: number, unit: Intl.RelativeTimeFormatUnit): RelativeTime => ({
    kind: 'ago',
    value: Math.max(1, Math.floor(value)),
    unit,
  });
  if (elapsed < MINUTE_MS) return { kind: 'justNow' };
  if (elapsed < HOUR_MS) return ago(elapsed / MINUTE_MS, 'minute');
  if (elapsed < DAY_MS) return ago(elapsed / HOUR_MS, 'hour');
  const days = elapsed / DAY_MS;
  if (days < 7) return ago(days, 'day');
  if (days < 30) return ago(days / 7, 'week');
  if (days < 365) return ago(days / 30, 'month');
  return ago(days / 365, 'year');
}

/** E.g. "yesterday", "last week", "3 months ago"; `justNow` is used for the last minute. */
export function formatRelativeTime(
  then: number,
  now: number,
  locale: string,
  justNow: string,
): string {
  const time = relativeTime(then, now);
  if (time.kind === 'justNow') return justNow;
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-time.value, time.unit);
}
