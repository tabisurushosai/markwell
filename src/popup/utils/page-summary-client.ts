import {
  isGetPageTextResponse,
  isSummarizePageResponse,
  type SummarizePageMessage,
} from '../../shared/messages/page-summary.js';
import { t } from '../../shared/utils/i18n.js';
import { getActiveTabId } from './tab-url.js';

export type PageTextFetchResult =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; reason: string };

export type PageSummaryBackgroundResult =
  | { ok: true; summary: string }
  | { ok: false; error: string; code?: 'PREMIUM_REQUIRED' };

export async function fetchPageTextFromActiveTab(): Promise<PageTextFetchResult> {
  const tabId = await getActiveTabId();
  if (tabId === null) {
    return { ok: false, reason: 'no_tab' };
  }

  try {
    const response: unknown = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_TEXT' });
    if (!isGetPageTextResponse(response)) {
      return { ok: false, reason: 'invalid' };
    }
    if (!response.ok) {
      return { ok: false, reason: response.reason };
    }
    return { ok: true, text: response.text, truncated: response.truncated };
  } catch {
    return { ok: false, reason: 'content_unavailable' };
  }
}

export async function requestPageSummaryViaBackground(
  text: string,
  pageTitle?: string,
): Promise<PageSummaryBackgroundResult> {
  const summarizeMessage: SummarizePageMessage = {
    type: 'SUMMARIZE_PAGE',
    text,
    ...(pageTitle !== undefined && pageTitle !== '' ? { page_title: pageTitle } : {}),
  };

  try {
    const response: unknown = await chrome.runtime.sendMessage(summarizeMessage);
    if (!isSummarizePageResponse(response)) {
      return { ok: false, error: t('popup_summary_invalid_response') };
    }
    return response;
  } catch {
    return { ok: false, error: t('popup_summary_request_failed') };
  }
}
