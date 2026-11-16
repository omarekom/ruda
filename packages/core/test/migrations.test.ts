import { describe, expect, it } from 'vitest';
import { RudaFileError } from '../src';
import { migrate, type Migration } from '../src/file/migrations';

const renameTitle: Migration = ({ title, ...rest }) => ({ ...rest, name: title });
const wrapBlocks: Migration = (file) => ({ ...file, blocks: { list: file['blocks'] } });

describe('migrate', () => {
  it('runs every step from the file format to the latest, in order', () => {
    const file = { format: 1, title: 'Old', blocks: [] };
    expect(migrate(file, [renameTitle, wrapBlocks])).toEqual({
      format: 3,
      name: 'Old',
      blocks: { list: [] },
    });
  });

  it('starts from the middle of the chain', () => {
    expect(migrate({ format: 2, name: 'x', blocks: [] }, [renameTitle, wrapBlocks])).toEqual({
      format: 3,
      name: 'x',
      blocks: { list: [] },
    });
  });

  it('leaves a current file unchanged', () => {
    const file = { format: 3, name: 'x' };
    expect(migrate(file, [renameTitle, wrapBlocks])).toBe(file);
  });

  it('rejects files newer than the chain', () => {
    expect(() => migrate({ format: 4 }, [renameTitle, wrapBlocks])).toThrow(RudaFileError);
  });
});
