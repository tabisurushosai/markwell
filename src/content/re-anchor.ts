import { getHighlight, updateHighlight } from '../shared/storage/highlights.js';
import type { Highlight } from '../shared/types/highlight.js';
import {
  applyHighlight,
  buildFallbackAnchor,
  findHighlightMarks,
  removeHighlightFromDom,
  serializeRange,
  syncHighlightNoteInDom,
} from './highlighter.js';

const REANCHOR_THROTTLE_MS = 5000;

const MARKWELL_UI_SELECTOR =
  'markwell-toolbar, markwell-edit-toolbar, markwell-note-dialog, markwell-delete-confirm-dialog, mw-upgrade-modal';

let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let lastRunAt = 0;
let reanchorRunning = false;
let observer: MutationObserver | null = null;

function isMarkwellUiNode(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(MARKWELL_UI_SELECTOR) !== null;
}

function sortMarksByDocumentPosition(marks: HTMLElement[]): HTMLElement[] {
  return [...marks].sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
}

function rangeFromHighlightMarks(marks: HTMLElement[]): Range | null {
  if (marks.length === 0) {
    return null;
  }

  const sorted = sortMarksByDocumentPosition(marks);
  const range = document.createRange();
  range.setStartBefore(sorted[0]);
  range.setEndAfter(sorted[sorted.length - 1]);
  return range;
}

function isAllowedBetweenElement(element: Element, highlightId: string): boolean {
  if (element.tagName === 'BR') {
    return true;
  }
  if (element.tagName === 'MARK' && element.getAttribute('data-markwell-id') === highlightId) {
    return true;
  }
  return false;
}

/** Whether foreign nodes sit between marks sharing the same highlight id. */
export function isHighlightFragmented(marks: HTMLElement[]): boolean {
  if (marks.length <= 1) {
    return false;
  }

  const highlightId = marks[0].getAttribute('data-markwell-id') ?? '';
  const sorted = sortMarksByDocumentPosition(marks);

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    const between = document.createRange();
    between.setStartAfter(start);
    between.setEndBefore(end);

    const fragment = between.cloneContents();
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node !== null) {
      if (!isAllowedBetweenElement(node as Element, highlightId)) {
        return true;
      }
      node = walker.nextNode();
    }
  }

  return false;
}

function collectHighlightIdsOnPage(): string[] {
  const ids = new Set<string>();
  for (const mark of document.querySelectorAll<HTMLElement>('mark[data-markwell-id]')) {
    const id = mark.getAttribute('data-markwell-id');
    if (id !== null && id !== '') {
      ids.add(id);
    }
  }
  return [...ids];
}

function anchorNeedsUpdate(highlight: Highlight, range: Range): boolean {
  const serialized = serializeRange(range);
  const fallback = buildFallbackAnchor(range);
  return (
    serialized !== highlight.anchor.serialized ||
    fallback.text !== highlight.anchor.fallback.text ||
    fallback.occurrence !== highlight.anchor.fallback.occurrence
  );
}

async function reanchorHighlight(id: string): Promise<void> {
  const highlight = await getHighlight(id);
  if (highlight === null) {
    return;
  }

  const marks = findHighlightMarks(id);
  if (marks.length === 0) {
    return;
  }

  const range = rangeFromHighlightMarks(marks);
  if (range === null) {
    return;
  }

  const fragmented = isHighlightFragmented(marks);
  if (!fragmented && !anchorNeedsUpdate(highlight, range)) {
    return;
  }

  if (fragmented) {
    const color = highlight.color;
    const note = highlight.note;
    removeHighlightFromDom(id);
    applyHighlight(range, color, id);
    syncHighlightNoteInDom(id, note);
  }

  const marksAfter = findHighlightMarks(id);
  const rangeForStore = rangeFromHighlightMarks(marksAfter) ?? range;
  const serialized = serializeRange(rangeForStore);
  const fallback = buildFallbackAnchor(rangeForStore);
  const selectedText = rangeForStore.toString();

  await updateHighlight(id, {
    anchor: {
      ...highlight.anchor,
      serialized,
      fallback,
    },
    selected_text: selectedText,
  });
}

async function runReanchorPass(): Promise<void> {
  if (reanchorRunning) {
    return;
  }

  reanchorRunning = true;
  observer?.disconnect();

  try {
    const ids = collectHighlightIdsOnPage();
    for (const id of ids) {
      await reanchorHighlight(id);
    }
  } finally {
    reanchorRunning = false;
    const root = document.body;
    if (root !== null && observer !== null) {
      observer.observe(root, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
  }
}

function scheduleReanchorPass(): void {
  if (throttleTimer !== null) {
    clearTimeout(throttleTimer);
  }

  const elapsed = Date.now() - lastRunAt;
  const delay = Math.max(0, REANCHOR_THROTTLE_MS - elapsed);

  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    lastRunAt = Date.now();
    void runReanchorPass();
  }, delay);
}

function shouldHandleMutations(mutations: MutationRecord[]): boolean {
  for (const mutation of mutations) {
    if (isMarkwellUiNode(mutation.target)) {
      continue;
    }
    if (mutation.type === 'characterData' || mutation.type === 'childList') {
      return true;
    }
  }
  return false;
}

function handleMutations(mutations: MutationRecord[]): void {
  if (reanchorRunning) {
    return;
  }
  if (!shouldHandleMutations(mutations)) {
    return;
  }
  scheduleReanchorPass();
}

export function initReanchorOnDomChange(): void {
  const root = document.body;
  if (root === null) {
    return;
  }

  observer = new MutationObserver(handleMutations);
  observer.observe(root, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}
