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
  undoToRange(range: RangyWrappedRange): void;
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

function buildHighlightStylesCss(): string {
  return `
    :root { --accent: #ffd34e; }
    @keyframes markwell-jump-flash {
      0%, 100% { outline: 2px solid transparent; outline-offset: 2px; }
      25%, 75% { outline: 2px solid var(--accent); outline-offset: 2px; }
      50% { outline: 2px solid transparent; outline-offset: 2px; }
    }
    mark.markwell-mark.markwell-jump-flash {
      animation: markwell-jump-flash 1.5s ease;
    }
    ${(Object.keys(HIGHLIGHT_STYLE_RULES) as HighlightColor[])
      .map(
        (color) =>
          `mark.markwell-mark.markwell-mark-${color} { ${HIGHLIGHT_STYLE_RULES[color]} border-radius: 2px; padding: 0 1px; }`,
      )
      .join('\n')}
    mark.markwell-mark[data-markwell-has-note="true"] {
      position: relative;
    }
    mark.markwell-mark[data-markwell-has-note="true"]::after {
      content: '📝';
      position: absolute;
      top: -0.55em;
      right: -0.25em;
      font-size: 10px;
      line-height: 1;
      pointer-events: none;
    }
    mark.markwell-mark[data-markwell-has-note="true"]
      + mark.markwell-mark[data-markwell-has-note="true"]::after {
      content: none;
    }
  `;
}

export function ensureHighlightStyles(): void {
  let style = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (style === null) {
    style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildHighlightStylesCss();
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

const MAX_TEXT_OCCURRENCES = 10_000;

/** Rangy.findText でページ内の完全一致をすべて収集する。 */
export function findAllTextOccurrenceRanges(text: string): Range[] {
  ensureRangyReady();
  if (text === '') {
    return [];
  }

  const scope = rangyApi.createRange();
  scope.selectNodeContents(ROOT_NODE);

  let searchFrom = rangyApi.createRange();
  searchFrom.selectNodeContents(ROOT_NODE);
  searchFrom.collapse(true);

  const matches: Range[] = [];

  while (matches.length < MAX_TEXT_OCCURRENCES) {
    const candidate = rangyApi.createRange();
    candidate.setStart(searchFrom.startContainer, searchFrom.startOffset);
    candidate.setEnd(scope.endContainer, scope.endOffset);

    if (!candidate.findText(text, { caseSensitive: true })) {
      break;
    }

    if (candidate.toString() === text) {
      matches.push(toDomRange(candidate));
    }

    searchFrom.setStart(candidate.endContainer, candidate.endOffset);
    searchFrom.collapse(true);

    if (searchFrom.compareBoundaryPoints(Range.END_TO_END, scope) >= 0) {
      break;
    }
  }

  return matches;
}

/** fallback.occurrence は 1-based。レガシー 0-based (0 = 先頭) も受け付ける。 */
function fallbackOccurrenceToIndex(occurrence: number): number {
  if (occurrence >= 1) {
    return occurrence - 1;
  }
  return occurrence;
}

export function findRangeByFallback(text: string, occurrence: number): Range | null {
  const index = fallbackOccurrenceToIndex(occurrence);
  if (text === '' || index < 0) {
    return null;
  }

  const matches = findAllTextOccurrenceRanges(text);
  return matches[index] ?? null;
}

export function restoreByFallback(highlight: Highlight): Range | null {
  const { text, occurrence } = highlight.anchor.fallback;
  return findRangeByFallback(text, occurrence);
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

/** 選択範囲がページ内の何個目の一致か（1-based）を返す。 */
export function computeFallbackOccurrence(text: string, target: Range): number {
  const matches = findAllTextOccurrenceRanges(text);
  for (let i = 0; i < matches.length; i++) {
    if (rangesEqual(matches[i], target)) {
      return i + 1;
    }
  }
  return 1;
}

/** applyHighlight 直前に保存する fallback アンカー。text は selected_text と同値だが役割を分離。 */
export function buildFallbackAnchor(range: Range): { text: string; occurrence: number } {
  const text = range.toString();
  return {
    text,
    occurrence: text === '' ? 1 : computeFallbackOccurrence(text, range),
  };
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
    syncHighlightNoteInDom(highlight.id, highlight.note);
    return true;
  }

  let range: Range | null = null;

  if (highlight.anchor.serialized !== '') {
    range = deserializeRange(highlight.anchor.serialized);
  }

  if (range === null) {
    range = restoreByFallback(highlight);
  }

  if (range === null) {
    return false;
  }

  applyHighlight(range, highlight.color, highlight.id);
  syncHighlightNoteInDom(highlight.id, highlight.note);
  return true;
}

export function restoreHighlights(highlights: Highlight[]): void {
  for (const highlight of highlights) {
    restoreHighlight(highlight);
  }
}

const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'pink', 'blue', 'orange'];

export function findHighlightMarks(id: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`mark[data-markwell-id="${id}"]`)];
}

const JUMP_FLASH_CLASS = 'markwell-jump-flash';
const JUMP_FLASH_MS = 1500;

/** 該当 mark へスクロールしアクセント色で点滅。見つからなければ false。 */
export function jumpToHighlight(id: string): boolean {
  const marks = findHighlightMarks(id);
  if (marks.length === 0) {
    return false;
  }

  ensureHighlightStyles();
  marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

  for (const mark of marks) {
    mark.classList.remove(JUMP_FLASH_CLASS);
    // reflow でアニメーションを再トリガー
    void mark.offsetWidth;
    mark.classList.add(JUMP_FLASH_CLASS);
    window.setTimeout(() => {
      mark.classList.remove(JUMP_FLASH_CLASS);
    }, JUMP_FLASH_MS);
  }

  return true;
}

export function getHighlightMarksRect(marks: HTMLElement[]): DOMRect {
  if (marks.length === 0) {
    return new DOMRect(0, 0, 0, 0);
  }

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const mark of marks) {
    const rect = mark.getBoundingClientRect();
    top = Math.min(top, rect.top);
    left = Math.min(left, rect.left);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  return new DOMRect(left, top, right - left, bottom - top);
}

export function updateHighlightColorInDom(id: string, color: HighlightColor): void {
  for (const mark of findHighlightMarks(id)) {
    for (const c of HIGHLIGHT_COLORS) {
      mark.classList.remove(`markwell-mark-${c}`);
    }
    mark.classList.add('markwell-mark', `markwell-mark-${color}`);
  }
}

export function syncHighlightNoteInDom(id: string, note: string): void {
  const hasNote = note.trim() !== '';
  for (const mark of findHighlightMarks(id)) {
    if (hasNote) {
      mark.setAttribute('data-markwell-has-note', 'true');
    } else {
      mark.removeAttribute('data-markwell-has-note');
    }
  }
}

function getHighlightColorFromMark(mark: HTMLElement): HighlightColor {
  for (const color of HIGHLIGHT_COLORS) {
    if (mark.classList.contains(`markwell-mark-${color}`)) {
      return color;
    }
  }
  return 'yellow';
}

/** Unwrap mark elements via Rangy ClassApplier (spec: removeHighlights). */
export function removeHighlightFromDom(id: string): void {
  ensureRangyReady();
  const marks = findHighlightMarks(id);
  if (marks.length === 0) {
    return;
  }

  const color = getHighlightColorFromMark(marks[0]);
  const applier = createApplier(color, id);

  for (let i = marks.length - 1; i >= 0; i--) {
    const mark = marks[i];
    if (mark.parentNode === null) {
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(mark);
    applier.undoToRange(toRangyRange(range));
  }
}
