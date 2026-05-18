import { GeminiError } from '../../shared/ai/gemini.js';

export function formatSynthesisError(error: unknown): string {
  if (error instanceof GeminiError) {
    switch (error.kind) {
      case 'AUTH':
        return '**エラー:** API キーが無効です。設定画面で Gemini API キーを確認してください。';
      case 'QUOTA':
        return '**エラー:** API の利用上限に達しました。しばらく待ってから再試行してください。';
      case 'NETWORK':
        return '**エラー:** ネットワークに接続できませんでした。';
      case 'SERVER':
        return '**エラー:** Gemini サーバーエラーです。しばらく待ってから再試行してください。';
      default:
        return `**エラー:** ${error.message}`;
    }
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
