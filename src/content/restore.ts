import { listHighlights } from '../shared/storage/highlights.js';
import type { Highlight } from '../shared/types/highlight.js';
import { getCanonicalUrl } from '../shared/utils/url.js';
import {
  applyHighlight,
  deserializeRange,
  ensureHighlightStyles,
  restoreByFallback,
  syncHighlightNoteInDom,
} from './highlighter.js';

const RESTORE_DELAY_MS = 300;
const LARGE_HIGHLIGHT_THRESHOLD = 50;
const IDLE_RESTORE_TIMEOUT_MS = 2000;

function waitForDocumentComplete(): Promise<void> {
  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const onReady = (): void => {
      if (document.readyState === 'complete') {
        window.removeEventListener('readystatechange', onReady);
        resolve();
      }
    };
    window.addEventListener('readystatechange', onReady);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function reportHighlightLost(highlightId: string): void {
  chrome.runtime
    .sendMessage({
      type: 'HIGHLIGHT_LOST',
      highlight_id: highlightId,
    })
    .catch(() => {
      // Background may not be listening yet.
    });
}

function resolveHighlightRange(highlight: Highlight): Range | null {
  let range: Range | null = null;

  if (highlight.anchor.serialized !== '') {
    range = deserializeRange(highlight.anchor.serialized);
  }

  if (range === null) {
    range = restoreByFallback(highlight);
  }

  return range;
}

function restoreOneHighlight(highlight: Highlight): boolean {
  if (document.querySelector(`[data-markwell-id="${highlight.id}"]`) !== null) {
    syncHighlightNoteInDom(highlight.id, highlight.note);
    return true;
  }

  const range = resolveHighlightRange(highlight);
  if (range === null) {
    reportHighlightLost(highlight.id);
    return false;
  }

  applyHighlight(range, highlight.color, highlight.id);
  syncHighlightNoteInDom(highlight.id, highlight.note);
  return true;
}

function restoreHighlightsSync(highlights: Highlight[]): void {
  for (const highlight of highlights) {
    restoreOneHighlight(highlight);
  }
}

function requestIdleCallbackCompat(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
): number {
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    return ric(callback, options);
  }

  return window.setTimeout(() => {
    callback({
      didTimeout: true,
      timeRemaining: () => 0,
    });
  }, 1) as unknown as number;
}

function restoreHighlightsIdle(highlights: Highlight[]): Promise<void> {
  let index = 0;

  return new Promise((resolve) => {
    const processChunk = (deadline: IdleDeadline): void => {
      while (index < highlights.length && deadline.timeRemaining() > 0) {
        restoreOneHighlight(highlights[index]);
        index += 1;
      }

      if (index >= highlights.length) {
        resolve();
        return;
      }

      requestIdleCallbackCompat(processChunk, { timeout: IDLE_RESTORE_TIMEOUT_MS });
    };

    requestIdleCallbackCompat(processChunk, { timeout: IDLE_RESTORE_TIMEOUT_MS });
  });
}

export async function restoreHighlightsForPage(highlights: Highlight[]): Promise<void> {
  ensureHighlightStyles();

  if (highlights.length > LARGE_HIGHLIGHT_THRESHOLD) {
    await restoreHighlightsIdle(highlights);
    return;
  }

  restoreHighlightsSync(highlights);
}

export async function restoreHighlightsForCurrentUrl(): Promise<void> {
  const highlights = await listHighlights({ url_canonical: getCanonicalUrl() });
  await restoreHighlightsForPage(highlights);
}

export function scheduleRestoreOnLoad(): void {
  void (async () => {
    await waitForDocumentComplete();
    await delay(RESTORE_DELAY_MS);
    await restoreHighlightsForCurrentUrl();
  })();
}
