import { GeminiError } from '../../shared/ai/gemini.js';
import { AiAccessError } from '../../shared/license/ai-access.js';
import { t } from '../../shared/utils/i18n.js';

function synthesisError(body: string): string {
  return `${t('synthesis_error_prefix')} ${body}`;
}

export function formatSynthesisError(error: unknown): string {
  if (error instanceof GeminiError) {
    switch (error.kind) {
      case 'AUTH':
        return synthesisError(t('error_api_key_invalid'));
      case 'QUOTA':
        return synthesisError(t('error_quota_exceeded'));
      case 'NETWORK':
        return synthesisError(t('error_network'));
      case 'SERVER':
        return synthesisError(t('synthesis_error_server'));
      default:
        return synthesisError(error.message);
    }
  }
  if (error instanceof AiAccessError) {
    return synthesisError(t('synthesis_error_trial_required'));
  }
  if (error instanceof Error) {
    if (error.message === 'API key not set') {
      return synthesisError(t('synthesis_error_api_key_not_set'));
    }
    return synthesisError(error.message);
  }
  return synthesisError(t('synthesis_error_failed'));
}

export function isSynthesisAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function isSynthesisErrorMarkdown(markdown: string): boolean {
  return markdown.startsWith(t('synthesis_error_prefix'));
}
