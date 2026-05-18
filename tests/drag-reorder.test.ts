import { describe, expect, it } from 'vitest';
import { computeInsertIndex, reorderByIndex } from '../src/side-panel/utils/drag-reorder.js';

describe('drag-reorder', () => {
  it('computeInsertIndex picks before or after midpoint', () => {
    expect(computeInsertIndex(40, 0, 100, 1)).toBe(1);
    expect(computeInsertIndex(60, 0, 100, 1)).toBe(2);
  });

  it('reorderByIndex moves item', () => {
    expect(reorderByIndex(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'a', 'c']);
    expect(reorderByIndex(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(reorderByIndex(['a', 'b', 'c'], 1, 2)).toEqual(['a', 'b', 'c']);
  });
});
