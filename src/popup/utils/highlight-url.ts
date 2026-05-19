import { highlightFragmentId } from '../../shared/utils/highlight-hash.js';
import type { Highlight } from '../../shared/types/highlight.js';

/** URL to open in a new tab (with #markwell-<id>) */
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
