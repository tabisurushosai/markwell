import { describe, expect, it } from 'vitest';
import type { Highlight } from '../src/shared/types/highlight.js';
import { filterHighlights } from '../src/popup/utils/search.js';
import { buildHighlightOpenUrl } from '../src/popup/utils/highlight-url.js';
import { parseHighlightIdFromHash } from '../src/shared/utils/highlight-hash.js';

const base: Omit<Highlight, 'id' | 'created_at' | 'updated_at'> = {
  url: 'https://example.com/page?q=1',
  url_canonical: 'https://example.com/page',
  page_title: 'Example Page',
  selected_text: 'hello world',
  context_before: '',
  context_after: '',
  anchor: { type: 'rangy', serialized: '', fallback: { text: 'hello', occurrence: 0 } },
  color: 'yellow',
  note: 'my note',
  tag_ids: [],
  project_id: null,
  ai_tags: [],
  domain: 'example.com',
  favicon_data_url: '',
};

describe('search', () => {
  it('filters by selected_text, note, page_title, domain case-insensitively', () => {
    const highlights: Highlight[] = [
      { ...base, id: '1', created_at: 100, updated_at: 100 },
      { ...base, id: '2', created_at: 200, updated_at: 200, selected_text: 'other' },
    ];
    const results = filterHighlights(highlights, 'EXAMPLE');
    expect(results.map((h) => h.id)).toEqual(['2', '1']);
  });

  it('builds open url with markwell fragment', () => {
    const url = buildHighlightOpenUrl({ ...base, id: 'abc', created_at: 0, updated_at: 0 });
    expect(url).toContain('#markwell-abc');
  });

  it('parses highlight id from hash', () => {
    expect(parseHighlightIdFromHash('#markwell-abc')).toBe('abc');
    expect(parseHighlightIdFromHash('#other')).toBeNull();
  });
});
