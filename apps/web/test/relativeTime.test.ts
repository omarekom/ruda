import { describe, expect, it } from 'vitest';
import { formatRelativeTime, relativeTime } from '../src/relativeTime';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 17, 12);

describe('relativeTime', () => {
  it('calls the last minute just now, also for clocks slightly ahead', () => {
    expect(relativeTime(NOW - 30_000, NOW)).toEqual({ kind: 'justNow' });
    expect(relativeTime(NOW + 5_000, NOW)).toEqual({ kind: 'justNow' });
  });

  it('picks the largest unit that fits', () => {
    expect(relativeTime(NOW - 5 * MINUTE, NOW)).toEqual({ kind: 'ago', value: 5, unit: 'minute' });
    expect(relativeTime(NOW - 3 * HOUR, NOW)).toEqual({ kind: 'ago', value: 3, unit: 'hour' });
    expect(relativeTime(NOW - 2 * DAY, NOW)).toEqual({ kind: 'ago', value: 2, unit: 'day' });
    expect(relativeTime(NOW - 10 * DAY, NOW)).toEqual({ kind: 'ago', value: 1, unit: 'week' });
    expect(relativeTime(NOW - 70 * DAY, NOW)).toEqual({ kind: 'ago', value: 2, unit: 'month' });
    expect(relativeTime(NOW - 800 * DAY, NOW)).toEqual({ kind: 'ago', value: 2, unit: 'year' });
  });
});

describe('formatRelativeTime', () => {
  it('reads like speech', () => {
    expect(formatRelativeTime(NOW, NOW, 'en', 'just now')).toBe('just now');
    expect(formatRelativeTime(NOW - DAY, NOW, 'en', 'just now')).toBe('yesterday');
    expect(formatRelativeTime(NOW - 8 * DAY, NOW, 'en', 'just now')).toBe('last week');
    expect(formatRelativeTime(NOW - 3 * HOUR, NOW, 'en', 'just now')).toBe('3 hours ago');
  });
});
