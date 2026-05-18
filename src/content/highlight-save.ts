import { maybeApplyAutoTagsAfterCreate } from '../shared/ai/auto-tag.js';
import { assertHighlightLimit, createHighlight } from '../shared/storage/highlights.js';
import { getCurrentTier } from '../shared/storage/license.js';
import type { Highlight, HighlightColor } from '../shared/types/highlight.js';
import { getCanonicalUrl } from '../shared/utils/url.js';
import {
  applyHighlight,
  buildFallbackAnchor,
  getSelectionContext,
  serializeRange,
  syncHighlightNoteInDom,
} from './highlighter.js';

export async function saveHighlightFromRange(
  range: Range,
  color: HighlightColor,
  note = '',
): Promise<Highlight> {
  const tier = await getCurrentTier();
  await assertHighlightLimit(tier);

  const selectedText = range.toString();
  const serialized = serializeRange(range);
  const { before, after } = getSelectionContext(range);
  const fallback = buildFallbackAnchor(range);

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
      fallback,
    },
    color,
    note,
    tag_ids: [],
    project_id: null,
    ai_tags: [],
    translation_cache: {},
    domain: location.hostname,
    favicon_data_url: '',
  });

  applyHighlight(range, highlight.color, highlight.id);
  syncHighlightNoteInDom(highlight.id, highlight.note);
  void maybeApplyAutoTagsAfterCreate(highlight.id, highlight.selected_text);
  return highlight;
}
