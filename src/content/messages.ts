import { getHighlight } from '../shared/storage/highlights.js';
import { getCanonicalUrl } from '../shared/utils/url.js';

export type ContentMessage =
  | { type: 'GET_CANONICAL_URL' }
  | { type: 'JUMP_TO_HIGHLIGHT'; highlightId: string };

function scrollToHighlightText(text: string, occurrence: number): boolean {
  if (text === '') {
    return false;
  }

  let seen = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node !== null) {
    const content = node.textContent ?? '';
    let index = content.indexOf(text);
    while (index !== -1) {
      if (seen === occurrence) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + text.length);
        const element =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as Element)
            : range.startContainer.parentElement;
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      seen += 1;
      index = content.indexOf(text, index + 1);
    }
    node = walker.nextNode();
  }

  return false;
}

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
      case 'JUMP_TO_HIGHLIGHT':
        void (async () => {
          const highlight = await getHighlight(msg.highlightId);
          if (highlight === null) {
            sendResponse({ ok: false });
            return;
          }
          const ok = scrollToHighlightText(
            highlight.selected_text,
            highlight.anchor.fallback.occurrence,
          );
          sendResponse({ ok });
        })();
        return true;
      default:
        return false;
    }
  });
}
