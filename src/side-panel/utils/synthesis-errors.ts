import { GeminiError } from '../../shared/ai/gemini.js';
import { AiAccessError } from '../../shared/license/ai-access.js';
import { t } from '../../shared/utils/i18n.js';

export function formatSynthesisError(error: unknown): string {
  if (error instanceof GeminiError) {
    switch (error.kind) {
      case 'AUTH':
        return `**エラー:** ${t('error_api_key_invalid')}`;
      case 'QUOTA':
        return `**エラー:** ${t('error_quota_exceeded')}`;
      case 'NETWORK':
        return `**エラー:** ${t('error_network')}`;
      case 'SERVER':
        return '**エラー:** Gemini サーバーエラーです。しばらく待ってから再試行してください。';
      default:
        return `**エラー:** ${error.message}`;
    }
  }
  if (error instanceof AiAccessError) {
    return '**エラー:** トライアルまたは Premium で利用できます。';
  }
  if (error instanceof Error) {
    if (error.message === 'API key not set') {
      return '**エラー:** API キーが未設定です。設定画面で Gemini API キーを登録してください。';
    }
    return `**エラー:** ${error.message}`;
  }
  return '**エラー:** 合成に失敗しました。';
}

export function isSynthesisAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
