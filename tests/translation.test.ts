import { describe, expect, it, vi } from 'vitest';

import {
  buildTranslationPrompt,
  getCachedTranslation,
  mergeTranslationCache,
  parseTranslationResponse,
  translateHighlightText,
} from '../src/shared/ai/translation.js';
import type { Highlight } from '../src/shared/types/highlight.js';

vi.mock('../src/shared/storage/settings.js', () => ({
  getApiKey: vi.fn(),
}));

vi.mock('../src/shared/ai/gemini.js', () => ({
  callGemini: vi.fn(),
}));

function sampleHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: 'hl-1',
    url: 'https://example.com',
    url_canonical: 'https://example.com',
    page_title: 'Page',
    selected_text: 'Hello world',
    context_before: '',
    context_after: '',
    anchor: { type: 'rangy', serialized: '', fallback: { text: '', occurrence: 0 } },
    color: 'yellow',
    note: 'my note',
    tag_ids: [],
    project_id: null,
    ai_tags: [],
    translation_cache: {},
    created_at: 1000,
    updated_at: 1000,
    domain: 'example.com',
    favicon_data_url: '',
    ...overrides,
  };
}

describe('translation', () => {
  it('buildTranslationPrompt includes target language', () => {
    expect(buildTranslationPrompt('Hello', 'ja')).toContain('日本語');
    expect(buildTranslationPrompt('Hello', 'ja')).toContain('Hello');
  });

  it('getCachedTranslation returns stored translation', () => {
    const highlight = sampleHighlight({
      translation_cache: { ja: 'こんにちは' },
    });
    expect(getCachedTranslation(highlight, 'ja')).toBe('こんにちは');
    expect(getCachedTranslation(highlight, 'en')).toBeUndefined();
  });

  it('mergeTranslationCache preserves other languages', () => {
    const highlight = sampleHighlight({
      translation_cache: { en: 'Hi' },
    });
    expect(mergeTranslationCache(highlight, 'ja', 'やあ')).toEqual({
      en: 'Hi',
      ja: 'やあ',
    });
  });

  it('translateHighlightText calls Gemini when API key is set', async () => {
    const { getApiKey } = await import('../src/shared/storage/settings.js');
    const { callGemini } = await import('../src/shared/ai/gemini.js');
    vi.mocked(getApiKey).mockResolvedValue('key');
    vi.mocked(callGemini).mockResolvedValue('  こんにちは世界  ');

    const result = await translateHighlightText('Hello world', 'ja');
    expect(result).toBe('こんにちは世界');
    expect(parseTranslationResponse('  x  ')).toBe('x');
  });
});
