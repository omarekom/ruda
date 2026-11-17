export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const ARROW_KEYS: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
] satisfies ArrowKey[];
/** Neighbours may overlap by a pixel or so, from rounding and borders. */
const OVERLAP_TOLERANCE_PX = 2;

/** Sideways distance counts more than forward distance, so moves stay in their row or column. */
const SIDEWAYS_WEIGHT = 3;

/** The gap between two spans on a line; 0 where they overlap. */
function gap(start: number, length: number, otherStart: number, otherLength: number): number {
  return Math.max(0, otherStart - (start + length), start - (otherStart + otherLength));
}

export function isArrowKey(key: string): key is ArrowKey {
  return ARROW_KEYS.includes(key);
}

/**
 * The box to move to from `from` with an arrow key: the nearest one lying beyond `from` in
 * that direction, preferring those in the same row or column; undefined at the edge.
 */
export function nearestInDirection(
  from: Box,
  boxes: readonly Box[],
  key: ArrowKey,
): number | undefined {
  let best: number | undefined;
  let bestScore = Infinity;
  boxes.forEach((box, index) => {
    if (box === from) return;
    const forward = distanceAhead(from, box, key);
    if (forward < -OVERLAP_TOLERANCE_PX) return;
    const sideways =
      key === 'ArrowLeft' || key === 'ArrowRight'
        ? gap(from.top, from.height, box.top, box.height)
        : gap(from.left, from.width, box.left, box.width);
    const score = Math.max(0, forward) + sideways * SIDEWAYS_WEIGHT;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

/** How far `box` begins beyond the edge of `from` that faces the key's direction. */
function distanceAhead(from: Box, box: Box, key: ArrowKey): number {
  switch (key) {
    case 'ArrowRight':
      return box.left - (from.left + from.width);
    case 'ArrowLeft':
      return from.left - (box.left + box.width);
    case 'ArrowDown':
      return box.top - (from.top + from.height);
    case 'ArrowUp':
      return from.top - (box.top + box.height);
  }
}

/** Moves keyboard focus among `elements` by an arrow key, following their layout on screen. */
export function moveFocus(elements: readonly HTMLElement[], key: ArrowKey): void {
  const from = elements.find((element) => element === document.activeElement);
  if (!from) {
    elements[0]?.focus();
    return;
  }
  const others = elements.filter((element) => element !== from);
  const target = nearestInDirection(
    from.getBoundingClientRect(),
    others.map((element) => element.getBoundingClientRect()),
    key,
  );
  if (target !== undefined) others[target]?.focus();
}
