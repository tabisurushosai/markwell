import { highlightFragmentId } from '../../shared/utils/highlight-hash.js';
import type { Highlight } from '../../shared/types/highlight.js';

/** 新タブで開く URL（#markwell-<id> 付き） */
export function buildHighlightOpenUrl(highlight: Highlight): string {
  try {
    const url = new URL(highlight.url);
    url.hash = highlightFragmentId(highlight.id);
    return url.href;
  } catch {
    const separator = highlight.url.includes('#') ? '' : '#';
    return `${highlight.url}${separator}${highlightFragmentId(highlight.id)}`;
  }
}
