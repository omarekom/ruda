import { describe, expect, it } from 'vitest';
import {
  Axis,
  CURRENT_VERSION,
  Direction,
  parseWorld,
  repairWorld,
  RudaFileError,
  serializeWorld,
  Simulation,
  World,
} from '../src';
import { simulationFrom } from './helpers';

function errorCode(text: string): string | undefined {
  try {
    parseWorld(text);
  } catch (error) {
    return error instanceof RudaFileError ? error.code : 'unexpected';
  }
  return undefined;
}

describe('.ruda files', () => {
  it('writes blocks grouped by explicit state, sorted and minified', () => {
    const world = new World();
    world.set(4, 4, { type: 'torch', facing: Direction.East, lit: true });
    world.set(2, 2, { type: 'lever', on: false });
    world.set(1, 0, { type: 'wire' });
    world.set(0, 0, { type: 'wire' });
    world.set(-3, 5, { type: 'power_block' });
    expect(serializeWorld(world, 'Test')).toBe(
      `{"rudaversion":${CURRENT_VERSION},"name":"Test","blocks":{"lever:off":[2,2],"power_block":[-3,5],"torch:east:lit":[4,4],"wire":[0,0,1,0]}}`,
    );
  });

  it('round-trips every block type and state', () => {
    const sim = simulationFrom(`
#L-+o>S)B
.l<^v....`);
    sim.execute({ kind: 'interact', x: 7, y: 0 });
    sim.execute({ kind: 'interact', x: 8, y: 0 });
    sim.step();
    const text = serializeWorld(sim.blocks, 'Everything');
    const loaded = parseWorld(text);
    expect(loaded.name).toBe('Everything');
    expect(serializeWorld(loaded.world, 'Everything')).toBe(text);
    expect(loaded.world.blockCount).toBe(sim.blocks.blockCount);
  });

  it('restores a running circuit with derived power recomputed', () => {
    const { world } = parseWorld(
      '{"rudaversion":1,"name":"x","blocks":{"lever:on":[0,0],"wire":[1,0],"torch:east:unlit":[2,0],"lamp":[3,0]}}',
    );
    const sim = new Simulation(world);
    expect(sim.isChannelPowered(1, 0, Axis.Horizontal)).toBe(true);
    expect(sim.isLampLit(3, 0)).toBe(false);
    sim.step();
    expect(sim.isLampLit(3, 0)).toBe(false);
    expect(sim.isStable).toBe(true);
  });

  it('writes delayer and button state explicitly', () => {
    const sim = simulationFrom('#)B');
    sim.execute({ kind: 'interact', x: 1, y: 0 });
    sim.execute({ kind: 'interact', x: 2, y: 0 });
    sim.step();
    expect(serializeWorld(sim.blocks, 'x')).toContain('"button:9":[2,0],"delayer:east:2:01":[1,0]');
  });

  it.each([
    ['not json', 'invalid_json'],
    ['[1, 2]', 'not_ruda'],
    ['{"name":"x","blocks":{}}', 'not_ruda'],
    ['{"rudaversion":0,"name":"x","blocks":{}}', 'not_ruda'],
    [`{"rudaversion":${CURRENT_VERSION + 1},"name":"x","blocks":{}}`, 'too_new'],
    ['{"rudaversion":1,"blocks":{}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"redstone_block":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"dirt":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"lever":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"torch:up:lit":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"wire:on":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"wire":[0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"wire":[0.5,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"wire":[32000,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"wire":[0,0],"stone":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"delayer:east:2:1":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"delayer:east:5:00000":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"delayer:east:2:12":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"button:11":[0,0]}}', 'invalid_content'],
    ['{"rudaversion":1,"name":"x","blocks":{"button:05":[0,0]}}', 'invalid_content'],
  ])('rejects %s with %s', (text, code) => {
    expect(errorCode(text)).toBe(code);
  });

  describe('repairing a damaged file', () => {
    it('reports nothing for an intact file', () => {
      const repaired = repairWorld('{"rudaversion":1,"name":"x","blocks":{"wire":[0,0]}}');
      expect(repaired.problems).toEqual([]);
      expect(repaired.world.get(0, 0)).toEqual({ type: 'wire' });
    });

    it('skips unknown blocks, bad cells and repeated cells, and says so', () => {
      const repaired = repairWorld(
        '{"rudaversion":1,"name":"x","blocks":{"dirt":[0,0],"wire":[1,0,"a",2,9,9,32000,0],"lamp":[1,0],"lever":[3,0]}}',
      );
      expect(repaired.world.blockCount).toBe(2);
      expect(repaired.world.get(1, 0)).toEqual({ type: 'wire' });
      expect(repaired.world.get(9, 9)).toEqual({ type: 'wire' });
      expect(repaired.problems).toHaveLength(5);
    });

    it('drops pistons that lost their other half', () => {
      const repaired = repairWorld(
        '{"rudaversion":1,"name":"x","blocks":{"piston:east:extended":[0,0],"wire":[5,5]}}',
      );
      expect(repaired.world.blockCount).toBe(1);
      expect(repaired.problems).toHaveLength(1);
    });

    it('treats a missing name or blocks table as a problem, not a failure', () => {
      const repaired = repairWorld('{"rudaversion":1}');
      expect(repaired.name).toBe('');
      expect(repaired.problems).toHaveLength(2);
    });

    it.each([
      ['not json at all', 'invalid_json'],
      ['{"rudaversion":1,"name":"x" "blocks":{}}', 'invalid_json'],
      ['[1, 2]', 'not_ruda'],
      [`{"rudaversion":${CURRENT_VERSION + 1},"name":"x","blocks":{}}`, 'too_new'],
    ])('still rejects %s with %s', (text, code) => {
      expect(() => repairWorld(text)).toThrow(expect.objectContaining({ code }));
    });
  });
});
