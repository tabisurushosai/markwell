import { describe, expect, it } from 'vitest';

import {
  clampFontScale,
  findInvalidRegExpPattern,
  linesFromTextarea,
  textareaFromLines,
} from '../src/options/utils/settings-form.js';

describe('settings form helpers', () => {
  it('clampFontScale limits to 0.8–1.4', () => {
    expect(clampFontScale(0.5)).toBe(0.8);
    expect(clampFontScale(2)).toBe(1.4);
    expect(clampFontScale(1.1)).toBe(1.1);
  });

  it('linesFromTextarea trims and drops empty lines', () => {
    expect(linesFromTextarea(' example.com \n\nfoo.com\n ')).toEqual(['example.com', 'foo.com']);
  });

  it('textareaFromLines joins with newlines', () => {
    expect(textareaFromLines(['a.com', 'b.com'])).toBe('a.com\nb.com');
  });

  it('findInvalidRegExpPattern detects invalid regex', () => {
    expect(findInvalidRegExpPattern(['^https://example\\.com'])).toBeNull();
    expect(findInvalidRegExpPattern(['[invalid'])).toBe('[invalid');
  });
});
