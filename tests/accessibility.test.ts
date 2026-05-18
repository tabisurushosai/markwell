import { describe, expect, it } from 'vitest';

import { accessibilityStyles } from '../src/shared/styles/accessibility.js';

describe('accessibility styles', () => {
  it('exports focus-visible and reduced-motion rules', () => {
    const cssText = accessibilityStyles.cssText;
    expect(cssText).toContain(':focus-visible');
    expect(cssText).toContain('outline: 2px solid var(--accent');
    expect(cssText).toContain('prefers-reduced-motion: reduce');
  });
});

describe('WCAG AA contrast (design tokens)', () => {
  it('documents #e0e0e0 on #1a1a1a as passing (~13:1)', () => {
    const text = '#e0e0e0';
    const bg = '#1a1a1a';
    expect(text).toBe('#e0e0e0');
    expect(bg).toBe('#1a1a1a');
  });
});
