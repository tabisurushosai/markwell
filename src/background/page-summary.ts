import { buildPageSummaryPrompt, canUsePageSummary } from '../shared/ai/page-summary.js';
import { callGemini, GeminiError } from '../shared/ai/gemini.js';
import { getCurrentTier } from '../shared/storage/license.js';
import type { SummarizePageMessage, SummarizePageResponse } from '../shared/messages/page-summary.js';

function formatSummaryError(error: unknown): string {
  if (error instanceof GeminiError) {
    switch (error.kind) {
      case 'AUTH':
        return 'API キーが無効です。設定画面で Gemini API キーを確認してください。';
      case 'QUOTA':
        return 'API の利用上限に達しました。しばらく待ってから再試行してください。';
      case 'NETWORK':
        return 'ネットワークに接続できませんでした。';
      case 'SERVER':
        return 'Gemini サーバーエラーです。しばらく待ってから再試行してください。';
      default:
        return error.message;
    }
  }
  if (error instanceof Error) {
    if (error.message === 'API key not set') {
      return 'API キーが未設定です。設定画面で Gemini API キーを登録してください。';
    }
    return error.message;
  }
  return '要約に失敗しました。';
}

export async function handleSummarizePageMessage(
  message: SummarizePageMessage,
): Promise<SummarizePageResponse> {
  const tier = await getCurrentTier();
  if (!canUsePageSummary(tier)) {
    return {
      ok: false,
      error: 'ページ要約は Premium（またはトライアル）で利用できます。',
      code: 'PREMIUM_REQUIRED',
    };
  }

  const trimmed = message.text.trim();
  if (trimmed === '') {
    return { ok: false, error: 'ページ本文を取得できませんでした。' };
  }

  try {
    const summary = await callGemini(buildPageSummaryPrompt(trimmed, message.page_title));
    const result = summary.trim();
    if (result === '') {
      return { ok: false, error: '要約を生成できませんでした。' };
    }
    return { ok: true, summary: result };
  } catch (error) {
    return { ok: false, error: formatSummaryError(error) };
  }
}

export function initPageSummaryMessaging(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (typeof message !== 'object' || message === null || !('type' in message)) {
      return false;
    }

    if (message.type !== 'SUMMARIZE_PAGE') {
      return false;
    }

    void (async () => {
      const response = await handleSummarizePageMessage(message as SummarizePageMessage);
      sendResponse(response);
    })();

    return true;
  });
}
