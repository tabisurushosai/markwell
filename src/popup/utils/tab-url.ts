/** タブ URL から canonical を推定（content script 未応答時のフォールバック） */
export function canonicalizeHref(href: string): string {
  try {
    const url = new URL(href);
    return `${url.origin}${url.pathname}`;
  } catch {
    return href;
  }
}

function isCanonicalResponse(value: unknown): value is { url_canonical: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.url_canonical === 'string';
}

export async function getCanonicalUrlForActiveTab(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) {
    return null;
  }

  const tab = tabs[0];
  const tabId = tab.id;
  const tabUrl = tab.url;
  if (tabUrl === undefined) {
    return null;
  }

  if (!tabUrl.startsWith('http://') && !tabUrl.startsWith('https://')) {
    return null;
  }

  if (tabId !== undefined) {
    try {
      const response: unknown = await chrome.tabs.sendMessage(tabId, { type: 'GET_CANONICAL_URL' });
      if (isCanonicalResponse(response)) {
        return response.url_canonical;
      }
    } catch {
      // Content script が未注入のページなど
    }
  }

  return canonicalizeHref(tabUrl);
}

export async function getActiveTabId(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0]?.id;
  return tabId ?? null;
}
