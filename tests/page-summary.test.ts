import { describe, expect, it } from 'vitest';

import {
  buildPageSummaryPrompt,
  canUsePageSummary,
  extractPageTextFromInnerText,
  PAGE_TEXT_MAX_LENGTH,
} from '../src/shared/ai/page-summary.js';

describe('page-summary', () => {
  it('canUsePageSummary allows trial and premium only', () => {
    expect(canUsePageSummary('free')).toBe(false);
    expect(canUsePageSummary('trial')).toBe(true);
    expect(canUsePageSummary('premium')).toBe(true);
  });

  it('extractPageTextFromInnerText caps at 8000 chars', () => {
    const long = 'a'.repeat(PAGE_TEXT_MAX_LENGTH + 100);
    const result = extractPageTextFromInnerText(long);
    expect(result.text).toHaveLength(PAGE_TEXT_MAX_LENGTH);
    expect(result.truncated).toBe(true);
  });

  it('buildPageSummaryPrompt requests 3-5 line summary', () => {
    const prompt = buildPageSummaryPrompt('本文テキスト', 'Example Page');
    expect(prompt).toContain('Example Page');
    expect(prompt).toContain('3〜5 行');
    expect(prompt).toContain('本文テキスト');
  });
});
