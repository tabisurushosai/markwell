import { describe, expect, it } from 'vitest';
import { clampIndex } from '../src/popup/utils/keyboard-navigation.js';

describe('keyboard-navigation', () => {
  it('clamps card focus index', () => {
    expect(clampIndex(-1, 3)).toBe(-1);
    expect(clampIndex(0, 3)).toBe(0);
    expect(clampIndex(5, 3)).toBe(2);
    expect(clampIndex(1, 0)).toBe(-1);
  });
});
