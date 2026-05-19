import type { Highlight } from '../../shared/types/highlight.js';
import { filterHighlightsByDate, type DateFilterValue, DEFAULT_DATE_FILTER } from './date-filter.js';
import { filterHighlights } from './search.js';

export const PROJECT_FILTER_ALL = 'all';
export const PROJECT_FILTER_UNASSIGNED = 'unassigned';

/** `all` | `unassigned` | project id */
export type ProjectFilterValue = string;

export function isProjectFilterActive(projectFilter: ProjectFilterValue): boolean {
  return projectFilter !== PROJECT_FILTER_ALL;
}

export function filterHighlightsByProject(
  highlights: Highlight[],
  projectFilter: ProjectFilterValue,
): Highlight[] {
  if (projectFilter === PROJECT_FILTER_ALL) {
    return highlights;
  }
  if (projectFilter === PROJECT_FILTER_UNASSIGNED) {
    return highlights.filter((highlight) => highlight.project_id === null);
  }
  return highlights.filter((highlight) => highlight.project_id === projectFilter);
}

/** Highlights that include every selected tag (AND) */
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
  options: {
    searchQuery?: string;
    tagIds?: string[];
    projectFilter?: ProjectFilterValue;
    dateFilter?: DateFilterValue;
  },
): Highlight[] {
  let result = filterHighlightsByDate(highlights, options.dateFilter ?? DEFAULT_DATE_FILTER);
  result = filterHighlightsByProject(result, options.projectFilter ?? PROJECT_FILTER_ALL);
  result = filterHighlightsByTagIds(result, options.tagIds ?? []);
  const query = options.searchQuery?.trim() ?? '';
  if (query !== '') {
    result = filterHighlights(result, query);
  }
  return result.sort((a, b) => b.created_at - a.created_at);
}
