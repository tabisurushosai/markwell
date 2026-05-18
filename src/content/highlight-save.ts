import { createHighlight } from '../shared/storage/highlights.js';
import type { HighlightColor } from '../shared/types/highlight.js';
import { getCanonicalUrl } from '../shared/utils/url.js';
import {
  applyHighlight,
  computeTextOccurrence,
  getSelectionContext,
  serializeRange,
  syncHighlightNoteInDom,
} from './highlighter.js';

export async function saveHighlightFromRange(
  range: Range,
  color: HighlightColor,
  note = '',
): Promise<void> {
  const selectedText = range.toString();
  const serialized = serializeRange(range);
  const { before, after } = getSelectionContext(range);
  const occurrence = computeTextOccurrence(selectedText, range);

  const highlight = await createHighlight({
    url: location.href,
    url_canonical: getCanonicalUrl(),
    page_title: document.title,
    selected_text: selectedText,
    context_before: before,
    context_after: after,
    anchor: {
      type: 'rangy',
      serialized,
      fallback: {
        text: selectedText,
        occurrence,
      },
    },
    color,
    note,
    tag_ids: [],
    project_id: null,
    ai_tags: [],
    domain: location.hostname,
    favicon_data_url: '',
  });

  applyHighlight(range, highlight.color, highlight.id);
  syncHighlightNoteInDom(highlight.id, highlight.note);
}
