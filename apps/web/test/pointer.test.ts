import { describe, expect, it } from 'vitest';
import { edgeScroll } from '../src/input/pointer';

const GAP = [300, 700] as const;

describe('edgeScroll', () => {
  it('scrolls towards the edges the cursor touches', () => {
    expect(edgeScroll([5, 300], 1000, 600, GAP)).toEqual([-1, 0]);
    expect(edgeScroll([995, 5], 1000, 600, GAP)).toEqual([1, -1]);
    expect(edgeScroll([500, 300], 1000, 600, GAP)).toEqual([0, 0]);
  });

  it('does not scroll down along the gap under the hotbar', () => {
    expect(edgeScroll([500, 595], 1000, 600, GAP)).toEqual([0, 0]);
    expect(edgeScroll([300, 595], 1000, 600, GAP)).toEqual([0, 0]);
  });

  it('still scrolls down beside the gap', () => {
    expect(edgeScroll([200, 595], 1000, 600, GAP)).toEqual([0, 1]);
    expect(edgeScroll([800, 595], 1000, 600, undefined)).toEqual([0, 1]);
  });
});
