import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from '../src/storage/newId';

describe('newId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('makes distinct UUID v4 strings', () => {
    const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const ids = new Set(Array.from({ length: 50 }, newId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(pattern);
  });

  it('works where crypto.randomUUID is missing (insecure contexts)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    expect(newId()).toHaveLength(36);
  });
});
