import type { HighlightColor } from '../shared/types/highlight.js';

/**
 * Persists a highlight for the current selection range.
 * Full Rangy anchor + DOM wrap implementation: markwell-018.
 */
export function saveHighlightFromRange(
  range: Range,
  color: HighlightColor,
  note = '',
): Promise<void> {
  void range;
  void color;
  void note;
  console.log('[markwell] saveHighlightFromRange (markwell-018)', { color, note });
  return Promise.resolve();
}
