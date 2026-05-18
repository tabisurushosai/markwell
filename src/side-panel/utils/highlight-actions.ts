import type { Highlight, HighlightColor } from '../../shared/types/highlight.js';
import { buildHighlightOpenUrl } from '../../popup/utils/highlight-url.js';
import { isJumpToHighlightResponse } from '../../popup/utils/jump.js';
import { isCanonicalResponse } from '../../popup/utils/tab-url.js';

/** 一致タブがあればジャンプ、なければハッシュ付き URL で新規タブ */
export async function jumpToHighlightFromSidePanel(highlight: Highlight): Promise<boolean> {
  const tabs = await chrome.tabs.query({});
  const httpTabs = tabs.filter(
    (tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
      tab.id !== undefined &&
      typeof tab.url === 'string' &&
      (tab.url.startsWith('http://') || tab.url.startsWith('https://')),
  );

  for (const tab of httpTabs) {
    try {
      const canonicalResponse: unknown = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_CANONICAL_URL',
      });
      if (
        !isCanonicalResponse(canonicalResponse) ||
        canonicalResponse.url_canonical !== highlight.url_canonical
      ) {
        continue;
      }

      const jumpResponse: unknown = await chrome.tabs.sendMessage(tab.id, {
        type: 'JUMP_TO_HIGHLIGHT',
        id: highlight.id,
      });
      if (tab.windowId !== undefined) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      await chrome.tabs.update(tab.id, { active: true });
      return isJumpToHighlightResponse(jumpResponse) && jumpResponse.ok;
    } catch {
      // content script 未注入など
    }
  }

  await chrome.tabs.create({ url: buildHighlightOpenUrl(highlight) });
  return true;
}

/** 同一 canonical URL のタブで DOM 上の色を更新 */
export async function notifyHighlightColorOnOpenTabs(
  highlight: Highlight,
  color: HighlightColor,
): Promise<void> {
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
          type: 'UPDATE_HIGHLIGHT_COLOR',
          id: highlight.id,
          color,
        });
      } catch {
        // content script 未注入など
      }
    }),
  );
}
