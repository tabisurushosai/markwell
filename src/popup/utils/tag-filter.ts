import type { Highlight } from '../../shared/types/highlight.js';
import { filterHighlights } from './search.js';

/** 選択タグをすべて含むハイライトのみ（AND） */
export function filterHighlightsByTagIds(highlights: Highlight[], tagIds: string[]): Highlight[] {
  if (tagIds.length === 0) {
    return highlights;
  }

  return highlights.filter((highlight) => {
    const highlightTagSet = new Set(highlight.tag_ids);
    return tagIds.every((tagId) => highlightTagSet.has(tagId));
  });
}

export function applyHighlightFilters(
  highlights: Highlight[],
  options: { searchQuery?: string; tagIds?: string[] },
): Highlight[] {
  let result = filterHighlightsByTagIds(highlights, options.tagIds ?? []);
  const query = options.searchQuery?.trim() ?? '';
  if (query !== '') {
    result = filterHighlights(result, query);
  }
  return result.sort((a, b) => b.created_at - a.created_at);
}
