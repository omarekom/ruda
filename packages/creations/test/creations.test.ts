import { parseWorld, serializeWorld } from '@ruda/core';
import { describe, expect, it } from 'vitest';
import { CREATIONS } from '../src';

describe('all creations', () => {
  it('have unique slugs and a title and description', () => {
    expect(new Set(CREATIONS.map((c) => c.slug)).size).toBe(CREATIONS.length);
    for (const creation of CREATIONS) {
      expect(creation.slug).toMatch(/^[a-z0-9-]+$/);
      expect(creation.title.length).toBeGreaterThan(0);
      expect(creation.description.length).toBeGreaterThan(0);
    }
  });

  it.each(CREATIONS.map((c) => [c.slug, c] as const))(
    '%s survives a save and load',
    (_, creation) => {
      const text = serializeWorld(creation.build().world, creation.title);
      expect(serializeWorld(parseWorld(text).world, creation.title)).toBe(text);
    },
  );

  it.each(CREATIONS.map((c) => [c.slug, c] as const))(
    '%s builds the same every time',
    (_, creation) => {
      expect(serializeWorld(creation.build().world, 'x')).toBe(
        serializeWorld(creation.build().world, 'x'),
      );
    },
  );
});
