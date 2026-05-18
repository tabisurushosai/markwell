import type { Highlight } from '../../shared/types/highlight.js';

export function highlightSearchHaystack(highlight: Highlight): string {
  return [highlight.selected_text, highlight.note, highlight.page_title, highlight.domain]
    .join('\n')
    .toLowerCase();
}

export function filterHighlights(highlights: Highlight[], query: string): Highlight[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === '') {
    return [];
  }

  return highlights
    .filter((highlight) => highlightSearchHaystack(highlight).includes(normalized))
    .sort((a, b) => b.created_at - a.created_at);
}
