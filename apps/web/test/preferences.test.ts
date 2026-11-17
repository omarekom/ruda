import { describe, expect, it } from 'vitest';
import { readPreferences, themeToRemember, writePreference } from '../src/preferences';

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear();
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

describe('preferences', () => {
  it('defaults to following the system and no last world', () => {
    expect(readPreferences(new MemoryStorage())).toEqual({
      theme: undefined,
      lastWorld: undefined,
    });
  });

  it('remembers what was written', () => {
    const storage = new MemoryStorage();
    writePreference('theme', 'dark', storage);
    writePreference('lastWorld', 'w1', storage);
    expect(readPreferences(storage)).toEqual({ theme: 'dark', lastWorld: 'w1' });
    writePreference('lastWorld', undefined, storage);
    expect(readPreferences(storage).lastWorld).toBeUndefined();
  });

  it('ignores values it does not recognise, such as the old automatic theme', () => {
    const storage = new MemoryStorage();
    storage.setItem('ruda.theme', 'auto');
    expect(readPreferences(storage).theme).toBeUndefined();
  });

  it('works without storage', () => {
    expect(readPreferences(undefined).theme).toBeUndefined();
    expect(() => writePreference('theme', 'light', undefined)).not.toThrow();
  });
});

describe('themeToRemember', () => {
  it('forgets the choice when it matches the system', () => {
    expect(themeToRemember('dark', 'dark')).toBeUndefined();
    expect(themeToRemember('light', 'light')).toBeUndefined();
  });

  it('keeps a choice that differs from the system', () => {
    expect(themeToRemember('dark', 'light')).toBe('dark');
    expect(themeToRemember('light', 'dark')).toBe('light');
  });
});
