import { describe, expect, it } from 'vitest';
import { readPreferences, writePreference } from '../src/preferences';

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
  it('defaults to no mode, the automatic theme and no last world', () => {
    expect(readPreferences(new MemoryStorage())).toEqual({
      mode: undefined,
      theme: 'auto',
      lastWorld: undefined,
    });
  });

  it('remembers what was written', () => {
    const storage = new MemoryStorage();
    writePreference('mode', 'expert', storage);
    writePreference('theme', 'dark', storage);
    writePreference('lastWorld', 'w1', storage);
    expect(readPreferences(storage)).toEqual({ mode: 'expert', theme: 'dark', lastWorld: 'w1' });
    writePreference('lastWorld', undefined, storage);
    expect(readPreferences(storage).lastWorld).toBeUndefined();
  });

  it('ignores values it does not recognise', () => {
    const storage = new MemoryStorage();
    storage.setItem('ruda.mode', 'creative');
    storage.setItem('ruda.theme', 'purple');
    expect(readPreferences(storage)).toMatchObject({ mode: undefined, theme: 'auto' });
  });

  it('works without storage', () => {
    expect(readPreferences(undefined).theme).toBe('auto');
    expect(() => writePreference('theme', 'light', undefined)).not.toThrow();
  });
});
