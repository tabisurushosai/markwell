import { describe, expect, it } from 'vitest';
import type { Highlight } from '../src/shared/types/highlight.js';
import { applyHighlightFilters, filterHighlightsByTagIds } from '../src/popup/utils/tag-filter.js';

const base: Omit<Highlight, 'id' | 'created_at' | 'updated_at'> = {
  url: 'https://example.com',
  url_canonical: 'https://example.com',
  page_title: 'Page',
  selected_text: 'alpha beta',
  context_before: '',
  context_after: '',
  anchor: { type: 'rangy', serialized: '', fallback: { text: 'a', occurrence: 0 } },
  color: 'yellow',
  note: '',
  tag_ids: ['t1'],
  project_id: null,
  ai_tags: [],
  domain: 'example.com',
  favicon_data_url: '',
};

describe('tag-filter', () => {
  const highlights: Highlight[] = [
    { ...base, id: '1', created_at: 100, updated_at: 100, tag_ids: ['t1'] },
    { ...base, id: '2', created_at: 200, updated_at: 200, tag_ids: ['t1', 't2'] },
    { ...base, id: '3', created_at: 300, updated_at: 300, tag_ids: ['t2'] },
  ];

  it('filters by AND tag ids', () => {
    expect(filterHighlightsByTagIds(highlights, ['t1', 't2']).map((h) => h.id)).toEqual(['2']);
  });

  it('combines tag and search filters with AND', () => {
    const results = applyHighlightFilters(highlights, {
      tagIds: ['t1'],
      searchQuery: 'beta',
    });
    expect(results.map((h) => h.id)).toEqual(['2', '1']);
  });
});
