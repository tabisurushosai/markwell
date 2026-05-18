import { jumpToHighlight } from './highlighter.js';
import { getCanonicalUrl } from '../shared/utils/url.js';

export type ContentMessage =
  | { type: 'GET_CANONICAL_URL' }
  | { type: 'JUMP_TO_HIGHLIGHT'; id: string };

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
      case 'JUMP_TO_HIGHLIGHT': {
        const ok = jumpToHighlight(msg.id);
        sendResponse({ ok } satisfies JumpToHighlightResponse);
        return true;
      }
      default:
        return false;
    }
  });
}
