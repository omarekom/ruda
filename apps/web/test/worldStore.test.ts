import { describe, expect, it } from 'vitest';
import { lastPlayedAt } from '../src/storage/worldStore';

describe('lastPlayedAt', () => {
  it('uses when the world was played, falling back to its save time for older worlds', () => {
    expect(lastPlayedAt({ updatedAt: 10, playedAt: 20 })).toBe(20);
    expect(lastPlayedAt({ updatedAt: 10 })).toBe(10);
  });
});
