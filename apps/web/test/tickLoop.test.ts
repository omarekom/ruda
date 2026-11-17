import { describe, expect, it } from 'vitest';
import { TickLoop } from '../src/game/tickLoop';

function loop(): { loop: TickLoop; ticks: () => number } {
  let count = 0;
  const tickLoop = new TickLoop(
    () => count++,
    () => {},
  );
  return { loop: tickLoop, ticks: () => count };
}

describe('TickLoop.advance', () => {
  it('runs 10 ticks per second of real time', () => {
    const { loop: l, ticks } = loop();
    for (let i = 0; i < 20; i++) l.advance(50);
    expect(ticks()).toBe(10);
  });

  it('reports how far the current tick has progressed', () => {
    const { loop: l } = loop();
    expect(l.advance(25)).toBeCloseTo(0.25);
  });

  it('runs no ticks while paused and shows the last tick as finished', () => {
    const { loop: l, ticks } = loop();
    l.advance(50);
    l.paused = true;
    expect(l.advance(1000)).toBe(1);
    expect(ticks()).toBe(0);
    l.paused = false;
    l.advance(60);
    expect(ticks()).toBe(0);
    l.advance(40);
    expect(ticks()).toBe(1);
  });

  it('runs faster at a higher speed', () => {
    const { loop: l, ticks } = loop();
    l.speed = 4;
    for (let i = 0; i < 10; i++) l.advance(25);
    expect(ticks()).toBe(10);
  });

  it('limits catch-up after a long frame', () => {
    const { loop: l, ticks } = loop();
    l.advance(5000);
    expect(ticks()).toBe(3);
  });
});
