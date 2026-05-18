import { describe, expect, it } from 'vitest';

import {
  buildQuoteDownloadFilename,
  buildQuoteExtractorPrompt,
  canUseQuoteExtractor,
  formatHighlightsForQuoteExtractor,
  QUOTE_EXTRACT_COUNT,
  resolveQuoteExtractCount,
} from '../src/shared/ai/quote-extractor.js';
import type { Highlight } from '../src/shared/types/highlight.js';

function sampleHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: 'hl-1',
    url: 'https://example.com',
    url_canonical: 'https://example.com',
    page_title: 'Research Page',
    selected_text: '印象的な一文',
    context_before: '',
    context_after: '',
    anchor: { type: 'rangy', serialized: '', fallback: { text: '', occurrence: 0 } },
    color: 'yellow',
    note: '',
    tag_ids: [],
    project_id: 'proj-1',
    ai_tags: [],
    translation_cache: {},
    created_at: 1000,
    updated_at: 1000,
    domain: 'example.com',
    favicon_data_url: '',
    ...overrides,
  };
}

describe('quote-extractor', () => {
  it('canUseQuoteExtractor allows trial and premium only', () => {
    expect(canUseQuoteExtractor('free')).toBe(false);
    expect(canUseQuoteExtractor('trial')).toBe(true);
    expect(canUseQuoteExtractor('premium')).toBe(true);
  });

  it('resolveQuoteExtractCount caps at five', () => {
    expect(resolveQuoteExtractCount(0)).toBe(0);
    expect(resolveQuoteExtractCount(3)).toBe(3);
    expect(resolveQuoteExtractCount(10)).toBe(QUOTE_EXTRACT_COUNT);
  });

  it('formatHighlightsForQuoteExtractor numbers entries', () => {
    const formatted = formatHighlightsForQuoteExtractor([
      sampleHighlight({ selected_text: 'first' }),
      sampleHighlight({ id: 'hl-2', selected_text: 'second' }),
    ]);
    expect(formatted).toContain('[1] first');
    expect(formatted).toContain('[2] second');
    expect(formatted).toContain('Research Page');
  });

  it('buildQuoteExtractorPrompt requests markdown with sources', () => {
    const prompt = buildQuoteExtractorPrompt([sampleHighlight()]);
    expect(prompt).toContain('印象的な引用');
    expect(prompt).toContain('出典: [番号]');
    expect(prompt).toContain('[1] 印象的な一文');
    expect(prompt).toContain('改変せず');
  });

  it('buildQuoteDownloadFilename is deterministic', () => {
    expect(buildQuoteDownloadFilename(Date.UTC(2026, 4, 18, 10, 30))).toBe(
      'markwell-quotes-20260518-1030.md',
    );
  });
});
