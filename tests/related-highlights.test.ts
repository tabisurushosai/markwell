import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildRelatedHighlightsPrompt,
  findRelatedHighlights,
  loadRelatedHighlightCandidates,
  mergeRelatedCandidateHighlights,
  parseRelatedHighlightIndices,
  resolveRelatedHighlights,
} from '../src/shared/ai/related-highlights.js';
import type { Highlight } from '../src/shared/types/highlight.js';

vi.mock('../src/shared/storage/highlights.js', () => ({
  listHighlights: vi.fn(),
}));

vi.mock('../src/shared/storage/license.js', () => ({
  getCurrentTier: vi.fn(),
}));

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
    selected_text: 'source text',
    context_before: '',
    context_after: '',
    anchor: { type: 'rangy', serialized: '', fallback: { text: '', occurrence: 0 } },
    color: 'yellow',
    note: '',
    tag_ids: [],
    project_id: null,
    ai_tags: [],
    created_at: 1000,
    updated_at: 1000,
    domain: 'example.com',
    favicon_data_url: '',
    ...overrides,
  };
}

describe('related-highlights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mergeRelatedCandidateHighlights dedupes, excludes source, caps at 30', () => {
    const source = sampleHighlight({ id: 'src' });
    const sameProject = Array.from({ length: 20 }, (_, i) =>
      sampleHighlight({
        id: `p-${String(i)}`,
        project_id: 'proj-1',
        created_at: 2000 - i,
      }),
    );
    const sharedTag = Array.from({ length: 20 }, (_, i) =>
      sampleHighlight({
        id: `t-${String(i)}`,
        tag_ids: ['tag-a'],
        created_at: 1500 - i,
      }),
    );

    const merged = mergeRelatedCandidateHighlights(source, [sameProject, sharedTag], 30);
    expect(merged).toHaveLength(30);
    expect(merged.some((h) => h.id === 'src')).toBe(false);
  });

  it('buildRelatedHighlightsPrompt numbers candidates', () => {
    const prompt = buildRelatedHighlightsPrompt('対象', [
      sampleHighlight({ id: 'a', selected_text: 'first' }),
      sampleHighlight({ id: 'b', selected_text: 'second' }),
    ]);
    expect(prompt).toContain('[1]first');
    expect(prompt).toContain('[2]second');
    expect(prompt).toContain('ID 番号配列のみ');
  });

  it('parseRelatedHighlightIndices returns up to 5 valid indices', () => {
    expect(parseRelatedHighlightIndices('[1, 3, 99, 2]', 5)).toEqual([1, 3, 2]);
    expect(parseRelatedHighlightIndices('```json\n[2,2,4]\n```', 4)).toEqual([2, 4]);
  });

  it('resolveRelatedHighlights maps indices to highlights', () => {
    const candidates = [
      sampleHighlight({ id: 'a' }),
      sampleHighlight({ id: 'b' }),
      sampleHighlight({ id: 'c' }),
    ];
    expect(resolveRelatedHighlights(candidates, [3, 1])).toEqual([candidates[2], candidates[0]]);
  });

  it('findRelatedHighlights skips when tier is free', async () => {
    const { getCurrentTier } = await import('../src/shared/storage/license.js');
    vi.mocked(getCurrentTier).mockResolvedValue('free');

    const result = await findRelatedHighlights(sampleHighlight());
    expect(result).toEqual([]);
  });

  it('findRelatedHighlights returns top matches on trial', async () => {
    const { getCurrentTier } = await import('../src/shared/storage/license.js');
    const { getApiKey } = await import('../src/shared/storage/settings.js');
    const { listHighlights } = await import('../src/shared/storage/highlights.js');
    const { callGemini } = await import('../src/shared/ai/gemini.js');

    const source = sampleHighlight({ id: 'src', tag_ids: ['tag-1'] });
    const c1 = sampleHighlight({ id: 'c1', tag_ids: ['tag-1'], selected_text: 'alpha' });
    const c2 = sampleHighlight({ id: 'c2', tag_ids: ['tag-1'], selected_text: 'beta' });

    vi.mocked(getCurrentTier).mockResolvedValue('trial');
    vi.mocked(getApiKey).mockResolvedValue('key');
    vi.mocked(listHighlights).mockResolvedValue([source, c1, c2]);
    vi.mocked(callGemini).mockResolvedValue('[2, 1]');

    const result = await findRelatedHighlights(source);
    expect(result.map((h) => h.id)).toEqual(['c2', 'c1']);
  });

  it('loadRelatedHighlightCandidates queries project and tags', async () => {
    const { listHighlights } = await import('../src/shared/storage/highlights.js');
    const source = sampleHighlight({
      project_id: 'proj-1',
      tag_ids: ['tag-a', 'tag-b'],
    });
    vi.mocked(listHighlights).mockImplementation(async (opts) => {
      if (opts?.project_id === 'proj-1') {
        return [sampleHighlight({ id: 'from-project', project_id: 'proj-1' })];
      }
      if (opts?.tag_id === 'tag-a') {
        return [sampleHighlight({ id: 'from-tag-a', tag_ids: ['tag-a'] })];
      }
      if (opts?.tag_id === 'tag-b') {
        return [sampleHighlight({ id: 'from-tag-b', tag_ids: ['tag-b'] })];
      }
      return [];
    });

    const candidates = await loadRelatedHighlightCandidates(source);
    expect(candidates.map((h) => h.id).sort()).toEqual(
      ['from-project', 'from-tag-a', 'from-tag-b'].sort(),
    );
    expect(listHighlights).toHaveBeenCalledTimes(3);
  });
});
