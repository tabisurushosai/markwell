import type { Highlight } from '../../shared/types/highlight.js';
import { isCanonicalResponse } from './tab-url.js';

/** Ask tabs with the same canonical URL to remove the mark from the DOM */
export async function notifyHighlightRemovedOnOpenTabs(highlight: Highlight): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const httpTabs = tabs.filter(
    (tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
      tab.id !== undefined &&
      typeof tab.url === 'string' &&
      (tab.url.startsWith('http://') || tab.url.startsWith('https://')),
  );

  await Promise.all(
    httpTabs.map(async (tab) => {
      try {
        const canonicalResponse: unknown = await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_CANONICAL_URL',
        });
        if (
          !isCanonicalResponse(canonicalResponse) ||
          canonicalResponse.url_canonical !== highlight.url_canonical
        ) {
          return;
        }
        await chrome.tabs.sendMessage(tab.id, {
          type: 'REMOVE_HIGHLIGHT_FROM_DOM',
          id: highlight.id,
        });
      } catch {
        // content script 未注入など
      }
    }),
  );
}
