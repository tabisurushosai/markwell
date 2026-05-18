import { describe, expect, it } from 'vitest';
import type { Highlight } from '../src/shared/types/highlight.js';
import { filterHighlightsByDate } from '../src/popup/utils/date-filter.js';
import {
  applyHighlightFilters,
  filterHighlightsByProject,
  filterHighlightsByTagIds,
} from '../src/popup/utils/tag-filter.js';

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
    { ...base, id: '1', created_at: 100, updated_at: 100, tag_ids: ['t1'], project_id: 'p1' },
    { ...base, id: '2', created_at: 200, updated_at: 200, tag_ids: ['t1', 't2'], project_id: null },
    { ...base, id: '3', created_at: 300, updated_at: 300, tag_ids: ['t2'], project_id: 'p1' },
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

  it('filters unassigned project highlights', () => {
    expect(filterHighlightsByProject(highlights, 'unassigned').map((h) => h.id)).toEqual(['2']);
  });

  it('combines project, tag, and search filters with AND', () => {
    const results = applyHighlightFilters(highlights, {
      projectFilter: 'p1',
      tagIds: ['t1'],
      searchQuery: 'alpha',
    });
    expect(results.map((h) => h.id)).toEqual(['1']);
  });

  it('filters by date preset', () => {
    const now = 1_700_000_000_000;
    const todayHighlight: Highlight = {
      ...highlights[0],
      id: 'today',
      created_at: now,
      updated_at: now,
    };
    const oldHighlight: Highlight = {
      ...highlights[0],
      id: 'old',
      created_at: now - 10 * 24 * 60 * 60 * 1000,
      updated_at: now - 10 * 24 * 60 * 60 * 1000,
    };
    const filtered = filterHighlightsByDate([todayHighlight, oldHighlight], { preset: 'today', customStart: '', customEnd: '' }, now);
    expect(filtered.map((h) => h.id)).toEqual(['today']);
  });
});
