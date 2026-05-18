import { describe, expect, it, vi } from 'vitest';

import {
  buildFactCheckPrompt,
  canUseFactCheck,
  formatFactCheckForCopy,
  getFactCheckButtonLabel,
  toFactCheckResult,
} from '../src/shared/ai/fact-check.js';
import {
  buildGoogleSearchRequestBody,
  extractGroundingSources,
} from '../src/shared/ai/gemini.js';

describe('fact-check', () => {
  it('canUseFactCheck allows premium only', () => {
    expect(canUseFactCheck('free')).toBe(false);
    expect(canUseFactCheck('trial')).toBe(false);
    expect(canUseFactCheck('premium')).toBe(true);
  });

  it('getFactCheckButtonLabel reflects tier', () => {
    expect(getFactCheckButtonLabel('premium')).toBe('🔎 ファクトチェック');
    expect(getFactCheckButtonLabel('trial')).toBe('🔎 Premium 機能');
    expect(getFactCheckButtonLabel('free')).toBe('🔎 Premium 機能');
  });

  it('buildFactCheckPrompt includes selected text', () => {
    const prompt = buildFactCheckPrompt('The Earth is flat');
    expect(prompt).toContain('web 検索で確認');
    expect(prompt).toContain('The Earth is flat');
  });

  it('toFactCheckResult maps grounded response', () => {
    const result = toFactCheckResult({
      text: '  回答  ',
      sources: [{ title: 'Example', uri: 'https://example.com' }],
      webSearchQueries: ['query'],
    });
    expect(result.answer).toBe('回答');
    expect(result.sources).toHaveLength(1);
    expect(result.webSearchQueries).toEqual(['query']);
  });

  it('formatFactCheckForCopy includes sources', () => {
    const text = formatFactCheckForCopy({
      answer: 'OK',
      sources: [{ title: 'Site', uri: 'https://site.test' }],
      webSearchQueries: [],
    });
    expect(text).toContain('OK');
    expect(text).toContain('https://site.test');
  });
});

describe('gemini google search', () => {
  it('buildGoogleSearchRequestBody includes google_search tool', () => {
    const body = JSON.parse(buildGoogleSearchRequestBody('prompt')) as {
      tools: Array<Record<string, unknown>>;
    };
    expect(body.tools).toEqual([{ google_search: {} }]);
  });

  it('extractGroundingSources dedupes by uri', () => {
    const sources = extractGroundingSources({
      groundingChunks: [
        { web: { uri: 'https://a.com', title: 'A' } },
        { web: { uri: 'https://a.com', title: 'A duplicate' } },
        { web: { uri: 'https://b.com', title: 'B' } },
      ],
    });
    expect(sources).toEqual([
      { title: 'A', uri: 'https://a.com' },
      { title: 'B', uri: 'https://b.com' },
    ]);
  });
});
