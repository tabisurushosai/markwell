import { deleteHighlight, getHighlight, updateHighlight } from '../../shared/storage/highlights.js';
import { addHighlightToProject } from '../../shared/storage/projects.js';
import type { Highlight } from '../../shared/types/highlight.js';
import { notifyHighlightRemovedOnOpenTabs } from './notify-highlight-removed.js';

export function mergeTagIds(existing: string[], toAdd: string[]): string[] {
  return [...new Set([...existing, ...toAdd])];
}

export async function bulkAddHighlightsToProject(
  highlightIds: string[],
  projectId: string,
): Promise<number> {
  let updated = 0;
  for (const highlightId of highlightIds) {
    await addHighlightToProject(projectId, highlightId);
    updated += 1;
  }
  return updated;
}

export async function bulkAddTagsToHighlights(
  highlightIds: string[],
  tagIds: string[],
): Promise<number> {
  if (tagIds.length === 0) {
    return 0;
  }

  let updated = 0;
  for (const highlightId of highlightIds) {
    const highlight = await getHighlight(highlightId);
    if (highlight === null) {
      continue;
    }
    const nextTagIds = mergeTagIds(highlight.tag_ids, tagIds);
    if (nextTagIds.length === highlight.tag_ids.length) {
      continue;
    }
    await updateHighlight(highlightId, { tag_ids: nextTagIds });
    updated += 1;
  }
  return updated;
}

export async function bulkDeleteHighlights(highlights: Highlight[]): Promise<number> {
  let deleted = 0;
  for (const highlight of highlights) {
    await deleteHighlight(highlight.id);
    await notifyHighlightRemovedOnOpenTabs(highlight);
    deleted += 1;
  }
  return deleted;
}
