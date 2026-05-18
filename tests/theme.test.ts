import { describe, expect, it } from 'vitest';
import {
  nextThemePreference,
  resolveEffectiveTheme,
} from '../src/popup/utils/theme.js';

describe('theme', () => {
  it('defaults to dark when preference is dark', () => {
    expect(resolveEffectiveTheme('dark', true)).toBe('dark');
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
  });

  it('uses system light only for auto preference', () => {
    expect(resolveEffectiveTheme('auto', true)).toBe('light');
    expect(resolveEffectiveTheme('auto', false)).toBe('dark');
  });

  it('cycles dark → light → auto', () => {
    expect(nextThemePreference('dark')).toBe('light');
    expect(nextThemePreference('light')).toBe('auto');
    expect(nextThemePreference('auto')).toBe('dark');
  });
});
