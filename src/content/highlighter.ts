import rangy from 'rangy';
import 'rangy/lib/rangy-classapplier.js';
import 'rangy/lib/rangy-serializer.js';
import 'rangy/lib/rangy-textrange.js';

import type { Highlight, HighlightColor } from '../shared/types/highlight.js';

const STYLE_ELEMENT_ID = 'markwell-highlight-styles';
const ROOT_NODE = document.documentElement;

const HIGHLIGHT_STYLE_RULES: Record<HighlightColor, string> = {
  yellow: 'background: rgba(255, 235, 59, 0.5);',
  green: 'background: rgba(129, 199, 132, 0.5);',
  pink: 'background: rgba(244, 143, 177, 0.5);',
  blue: 'background: rgba(100, 181, 246, 0.5);',
  orange: 'background: rgba(255, 183, 77, 0.5);',
};

interface RangyWrappedRange {
  setStart(node: Node, offset: number): void;
  setEnd(node: Node, offset: number): void;
  collapse(toStart: boolean): void;
  selectNodeContents(node: Node): void;
  compareBoundaryPoints(how: number, range: RangyWrappedRange): number;
  findText(text: string, options?: { caseSensitive?: boolean }): boolean;
  toString(): string;
  startContainer: Node;
  startOffset: number;
  endContainer: Node;
  endOffset: number;
}

interface RangyClassApplier {
  applyToRange(range: RangyWrappedRange): void;
}

interface RangyExtended {
  init(): void;
  createRange(): RangyWrappedRange;
  createClassApplier(className: string, options?: Record<string, unknown>): RangyClassApplier;
  serializeRange(range: Range, omitChecksum?: boolean, rootNode?: Node): string;
  deserializeRange(serialized: string, rootNode?: Node, doc?: Document): RangyWrappedRange;
  canDeserializeRange(serialized: string, rootNode?: Node, doc?: Document): boolean;
}

const rangyApi = rangy as unknown as RangyExtended;

let rangyReady = false;

function ensureRangyReady(): void {
  if (rangyReady) {
    return;
  }
  rangyApi.init();
  rangyReady = true;
}

export function ensureHighlightStyles(): void {
  if (document.getElementById(STYLE_ELEMENT_ID) !== null) {
    return;
  }

  const css = (Object.keys(HIGHLIGHT_STYLE_RULES) as HighlightColor[])
    .map(
      (color) =>
        `mark.markwell-mark.markwell-mark-${color} { ${HIGHLIGHT_STYLE_RULES[color]} border-radius: 2px; padding: 0 1px; }`,
    )
    .join('\n');

  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function toRangyRange(range: Range): RangyWrappedRange {
  const rangyRange = rangyApi.createRange();
  rangyRange.setStart(range.startContainer, range.startOffset);
  rangyRange.setEnd(range.endContainer, range.endOffset);
  return rangyRange;
}

function toDomRange(range: RangyWrappedRange | Range): Range {
  if (range instanceof Range) {
    return range;
  }
  const domRange = document.createRange();
  domRange.setStart(range.startContainer, range.startOffset);
  domRange.setEnd(range.endContainer, range.endOffset);
  return domRange;
}

function createApplier(color: HighlightColor, id: string): RangyClassApplier {
  return rangyApi.createClassApplier(`markwell-mark markwell-mark-${color}`, {
    elementTagName: 'mark',
    elementProperties: {
      className: `markwell-mark markwell-mark-${color}`,
    },
    elementAttributes: {
      'data-markwell-id': id,
    },
  });
}

export function applyHighlight(range: Range, color: HighlightColor, id: string): void {
  ensureRangyReady();
  ensureHighlightStyles();

  const applier = createApplier(color, id);
  const rangyRange = toRangyRange(range);
  applier.applyToRange(rangyRange);
}

export function serializeRange(range: Range): string {
  ensureRangyReady();
  return rangyApi.serializeRange(range, false, ROOT_NODE);
}

export function deserializeRange(serialized: string): Range | null {
  ensureRangyReady();
  if (serialized === '') {
    return null;
  }

  try {
    if (!rangyApi.canDeserializeRange(serialized, ROOT_NODE, document)) {
      return null;
    }
    const range = rangyApi.deserializeRange(serialized, ROOT_NODE, document);
    return toDomRange(range);
  } catch {
    return null;
  }
}

export function findRangeByFallback(text: string, occurrence: number): Range | null {
  ensureRangyReady();
  if (text === '') {
    return null;
  }

  const scope = rangyApi.createRange();
  scope.selectNodeContents(ROOT_NODE);

  let searchFrom = rangyApi.createRange();
  searchFrom.selectNodeContents(ROOT_NODE);
  searchFrom.collapse(true);

  let matchIndex = 0;

  while (matchIndex <= occurrence) {
    const candidate = rangyApi.createRange();
    candidate.setStart(searchFrom.startContainer, searchFrom.startOffset);
    candidate.setEnd(scope.endContainer, scope.endOffset);

    if (!candidate.findText(text, { caseSensitive: true })) {
      return null;
    }

    if (candidate.toString() === text) {
      if (matchIndex === occurrence) {
        return toDomRange(candidate);
      }
      matchIndex += 1;
    }

    searchFrom.setStart(candidate.endContainer, candidate.endOffset);
    searchFrom.collapse(true);

    if (searchFrom.compareBoundaryPoints(Range.END_TO_END, scope) >= 0) {
      return null;
    }
  }

  return null;
}

export function getSelectionContext(
  range: Range,
  length = 80,
): { before: string; after: string } {
  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(ROOT_NODE);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  const afterRange = range.cloneRange();
  afterRange.selectNodeContents(ROOT_NODE);
  afterRange.setStart(range.endContainer, range.endOffset);

  return {
    before: beforeRange.toString().slice(-length),
    after: afterRange.toString().slice(0, length),
  };
}

export function computeTextOccurrence(text: string, target: Range): number {
  let occurrence = 0;
  let index = 0;

  while (index < 10_000) {
    const found = findRangeByFallback(text, index);
    if (found === null) {
      break;
    }

    if (rangesEqual(found, target)) {
      return occurrence;
    }

    occurrence += 1;
    index += 1;
  }

  return occurrence;
}

function rangesEqual(a: Range, b: Range): boolean {
  return (
    a.startContainer === b.startContainer &&
    a.startOffset === b.startOffset &&
    a.endContainer === b.endContainer &&
    a.endOffset === b.endOffset
  );
}

export function restoreHighlight(highlight: Highlight): boolean {
  ensureRangyReady();
  ensureHighlightStyles();

  if (document.querySelector(`[data-markwell-id="${highlight.id}"]`) !== null) {
    return true;
  }

  let range: Range | null = null;

  if (highlight.anchor.serialized !== '') {
    range = deserializeRange(highlight.anchor.serialized);
  }

  if (range === null) {
    range = findRangeByFallback(highlight.anchor.fallback.text, highlight.anchor.fallback.occurrence);
  }

  if (range === null) {
    return false;
  }

  applyHighlight(range, highlight.color, highlight.id);
  return true;
}

export function restoreHighlights(highlights: Highlight[]): void {
  for (const highlight of highlights) {
    restoreHighlight(highlight);
  }
}
