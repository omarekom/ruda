import { describe, expect, it } from 'vitest';
import {
  CURRENT_VERSION,
  History,
  isValidLabel,
  MAX_LABEL_LENGTH,
  parseWorld,
  repairWorld,
  RudaFileError,
  serializeWorld,
  Simulation,
  World,
} from '../src';

describe('isValidLabel', () => {
  it.each([
    ['AND gate', true],
    ['ř', true],
    ['x'.repeat(MAX_LABEL_LENGTH), true],
    ['', false],
    [' padded', false],
    ['padded ', false],
    ['two\nlines', false],
    ['tab\there', false],
    ['x'.repeat(MAX_LABEL_LENGTH + 1), false],
  ])('%j is %s', (text, valid) => {
    expect(isValidLabel(text)).toBe(valid);
  });
});

describe('label command', () => {
  it('adds, changes and removes a label without touching the block below', () => {
    const sim = new Simulation();
    sim.execute({ kind: 'place', x: 0, y: 0, block: { type: 'stone' } });
    expect(sim.execute({ kind: 'label', x: 0, y: 0, text: 'Wall' })).toBe(true);
    expect(sim.blocks.label(0, 0)).toBe('Wall');
    expect(sim.execute({ kind: 'label', x: 0, y: 0, text: 'Big wall' })).toBe(true);
    expect(sim.blocks.label(0, 0)).toBe('Big wall');
    expect(sim.execute({ kind: 'label', x: 0, y: 0, text: '' })).toBe(true);
    expect(sim.blocks.label(0, 0)).toBeUndefined();
    expect(sim.blocks.get(0, 0)).toEqual({ type: 'stone' });
  });

  it('changes nothing for invalid text, the same text or an absent label', () => {
    const sim = new Simulation();
    expect(sim.execute({ kind: 'label', x: 0, y: 0, text: ' x' })).toBe(false);
    expect(sim.execute({ kind: 'label', x: 0, y: 0, text: '' })).toBe(false);
    sim.execute({ kind: 'label', x: 0, y: 0, text: 'x' });
    expect(sim.execute({ kind: 'label', x: 0, y: 0, text: 'x' })).toBe(false);
    expect(sim.execute({ kind: 'label', x: 32000, y: 0, text: 'x' })).toBe(false);
  });

  it('stays when the block in its cell is removed', () => {
    const sim = new Simulation();
    sim.execute({ kind: 'place', x: 0, y: 0, block: { type: 'stone' } });
    sim.execute({ kind: 'label', x: 0, y: 0, text: 'Wall' });
    sim.execute({ kind: 'remove', x: 0, y: 0 });
    expect(sim.blocks.label(0, 0)).toBe('Wall');
  });

  it('is undone and redone, back to the previous text', () => {
    const sim = new Simulation();
    const history = new History(sim);
    history.execute({ kind: 'label', x: 2, y: 3, text: 'First' });
    history.execute({ kind: 'label', x: 2, y: 3, text: 'Second' });
    history.execute({ kind: 'label', x: 2, y: 3, text: '' });
    history.undo();
    expect(sim.blocks.label(2, 3)).toBe('Second');
    history.undo();
    expect(sim.blocks.label(2, 3)).toBe('First');
    history.undo();
    expect(sim.blocks.label(2, 3)).toBeUndefined();
    history.redo();
    expect(sim.blocks.label(2, 3)).toBe('First');
  });
});

describe('labels in .ruda files', () => {
  it('are written sorted after the blocks, and left out when there are none', () => {
    const world = new World();
    world.set(0, 0, { type: 'wire' });
    expect(serializeWorld(world, 'x')).not.toContain('labels');
    world.setLabel(5, 1, 'B');
    world.setLabel(-2, 7, 'A "quoted"');
    expect(serializeWorld(world, 'x')).toBe(
      `{"rudaversion":${CURRENT_VERSION},"name":"x","blocks":{"wire":[0,0]},"labels":[[-2,7,"A \\"quoted\\""],[5,1,"B"]]}`,
    );
  });

  it('round-trip', () => {
    const world = new World();
    world.setLabel(1, 2, 'Adder – carry');
    const loaded = parseWorld(serializeWorld(world, 'x')).world;
    expect(loaded.label(1, 2)).toBe('Adder – carry');
    expect(loaded.labelCount).toBe(1);
  });

  it('a version 1 file loads with no labels', () => {
    const loaded = parseWorld('{"rudaversion":1,"name":"x","blocks":{"wire":[0,0]}}').world;
    expect(loaded.labelCount).toBe(0);
    expect(loaded.blockCount).toBe(1);
  });

  it.each([
    '{"x":1}',
    '[[0,0]]',
    '[[0,0,""]]',
    '[[0,0," x"]]',
    '[[0.5,0,"x"]]',
    '[[32000,0,"x"]]',
    '[[0,0,"x"],[0,0,"y"]]',
  ])('rejects labels %s', (labels) => {
    const text = `{"rudaversion":2,"name":"x","blocks":{},"labels":${labels}}`;
    expect(() => parseWorld(text)).toThrow(RudaFileError);
  });

  it('a damaged file keeps the labels it can read', () => {
    const repaired = repairWorld(
      '{"rudaversion":2,"name":"x","blocks":{},"labels":[[0,0,"ok"],[1,0,""],"junk",[0,0,"again"]]}',
    );
    expect(repaired.world.label(0, 0)).toBe('ok');
    expect(repaired.world.labelCount).toBe(1);
    expect(repaired.problems).toHaveLength(3);
  });
});
