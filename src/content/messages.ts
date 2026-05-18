import {
  jumpToHighlight,
  removeHighlightFromDom,
  updateHighlightColorInDom,
} from './highlighter.js';
import type { HighlightColor } from '../shared/types/highlight.js';
import { getCanonicalUrl } from '../shared/utils/url.js';
import { getPageTextForSummary } from './page-text.js';
import { handleHighlightWithNoteCommand, handleQuickHighlightCommand } from './shortcuts.js';
import type { GetPageTextResponse } from '../shared/messages/page-summary.js';

export type ContentRunCommand =
  | 'quick_highlight'
  | 'highlight_with_note';

export type ContentMessage =
  | { type: 'GET_CANONICAL_URL' }
  | { type: 'GET_PAGE_TEXT' }
  | { type: 'JUMP_TO_HIGHLIGHT'; id: string }
  | { type: 'REMOVE_HIGHLIGHT_FROM_DOM'; id: string }
  | { type: 'UPDATE_HIGHLIGHT_COLOR'; id: string; color: HighlightColor }
  | { type: 'RUN_COMMAND'; command: ContentRunCommand };

export type JumpToHighlightResponse = { ok: boolean };

export function initContentMessaging(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (typeof message !== 'object' || message === null || !('type' in message)) {
      return false;
    }

    const msg = message as ContentMessage;

    switch (msg.type) {
      case 'GET_CANONICAL_URL':
        sendResponse({ url_canonical: getCanonicalUrl() });
        return true;
      case 'GET_PAGE_TEXT': {
        const { text, truncated } = getPageTextForSummary();
        if (text.trim() === '') {
          sendResponse({ ok: false, reason: 'empty' } satisfies GetPageTextResponse);
        } else {
          sendResponse({ ok: true, text, truncated } satisfies GetPageTextResponse);
        }
        return true;
      }
      case 'JUMP_TO_HIGHLIGHT': {
        const ok = jumpToHighlight(msg.id);
        sendResponse({ ok } satisfies JumpToHighlightResponse);
        return true;
      }
      case 'REMOVE_HIGHLIGHT_FROM_DOM':
        removeHighlightFromDom(msg.id);
        sendResponse({ ok: true });
        return true;
      case 'UPDATE_HIGHLIGHT_COLOR':
        updateHighlightColorInDom(msg.id, msg.color);
        sendResponse({ ok: true });
        return true;
      case 'RUN_COMMAND': {
        void (async () => {
          const ok =
            msg.command === 'quick_highlight'
              ? await handleQuickHighlightCommand()
              : msg.command === 'highlight_with_note'
                ? await handleHighlightWithNoteCommand()
                : false;
          sendResponse({ ok });
        })();
        return true;
      }
      default:
        return false;
    }
  });
}
