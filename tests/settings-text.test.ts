import { describe, expect, it } from 'vitest';

import {
  clampFontScale,
  formatSettingLines,
  parseSettingLines,
} from '../src/options/utils/settings-text.js';

describe('settings-text', () => {
  it('parseSettingLines trims and drops empty lines', () => {
    expect(parseSettingLines(' example.com \n\nfoo.com  ')).toEqual(['example.com', 'foo.com']);
  });

  it('formatSettingLines joins with newlines', () => {
    expect(formatSettingLines(['a.com', 'b.com'])).toBe('a.com\nb.com');
  });

  it('clampFontScale limits to 0.8..1.4', () => {
    expect(clampFontScale(0.5)).toBe(0.8);
    expect(clampFontScale(2)).toBe(1.4);
    expect(clampFontScale(1.1)).toBe(1.1);
  });
});
