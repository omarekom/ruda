import { Direction, DIRECTIONS } from '@ruda/core';

/** Rotates the context so that a look drawn facing north faces `facing`. */
export function faceToward(g: CanvasRenderingContext2D, facing: Direction, size: number): void {
  g.translate(size / 2, size / 2);
  g.rotate((facing * Math.PI) / 2);
  g.translate(-size / 2, -size / 2);
}

export interface WireArms {
  /** Sides the wire reaches out to from the cell centre. */
  readonly sides: readonly Direction[];
  /** Arm length as a fraction of the cell. */
  readonly length: number;
  readonly attachedCount: number;
}

/**
 * Which arms a wire shows. An unattached wire is drawn as a short plus; a wire attached
 * on one side runs straight through the cell.
 */
export function wireArms(attached: readonly boolean[]): WireArms {
  const attachedCount = DIRECTIONS.filter((side) => attached[side]).length;
  const sides = DIRECTIONS.filter((side) => {
    if (attachedCount === 0) return true;
    if (attachedCount === 1) return attached[side] || attached[(side + 2) % 4];
    return attached[side];
  });
  return { sides, length: attachedCount === 0 ? 0.3 : 0.5, attachedCount };
}
