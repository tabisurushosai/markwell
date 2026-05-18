import { describe, expect, it } from 'vitest';
import type { Highlight } from '../src/shared/types/highlight.js';
import { formatHighlightAsMarkdown } from '../src/popup/utils/format-highlight-markdown.js';

const baseHighlight: Highlight = {
  id: 'h1',
  url: 'https://example.com/article',
  url_canonical: 'https://example.com/article',
  page_title: 'Example Page',
  selected_text: 'Hello world',
  context_before: '',
  context_after: '',
  anchor: {
    type: 'rangy',
    serialized: '',
    fallback: { text: 'Hello world', occurrence: 0 },
  },
  color: 'yellow',
  note: '',
  tag_ids: [],
  project_id: null,
  ai_tags: [],
  translation_cache: {},
  created_at: new Date('2024-06-15T12:00:00').getTime(),
  updated_at: 0,
  domain: 'example.com',
  favicon_data_url: '',
};

describe('formatHighlightAsMarkdown', () => {
  it('formats highlight without note', () => {
    const markdown = formatHighlightAsMarkdown(baseHighlight);
    expect(markdown).toBe(
      '> Hello world\n>\n> — [Example Page](https://example.com/article) (example.com, 2024-06-15)',
    );
  });

  it('includes note when present', () => {
    const markdown = formatHighlightAsMarkdown({
      ...baseHighlight,
      note: 'My note',
    });
    expect(markdown).toContain('> My note');
    expect(markdown.split('\n').at(-1)).toBe('> My note');
  });

  it('prefixes each line of multiline selection', () => {
    const markdown = formatHighlightAsMarkdown({
      ...baseHighlight,
      selected_text: 'Line one\nLine two',
    });
    expect(markdown).toContain('> Line one\n> Line two');
  });
});
