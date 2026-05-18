import { callGemini } from './gemini.js';
import { getApiKey } from '../storage/settings.js';
import type { Highlight } from '../types/highlight.js';

export const TRANSLATE_LANGUAGE_LABELS: Record<string, string> = {
  ja: '日本語',
  en: '英語',
  zh: '中国語（簡体字）',
  ko: '韓国語',
  fr: 'フランス語',
  de: 'ドイツ語',
};

export function getTranslateLanguageLabel(langCode: string): string {
  return TRANSLATE_LANGUAGE_LABELS[langCode] ?? langCode;
}

export function buildTranslationPrompt(text: string, targetLang: string): string {
  const label = getTranslateLanguageLabel(targetLang);
  return `次のテキストを${label}に翻訳してください。翻訳文のみを返答し、前置きや説明は付けないでください。

${text}`;
}

export function parseTranslationResponse(response: string): string {
  return response.trim();
}

export function getCachedTranslation(
  highlight: Highlight,
  targetLang: string,
): string | undefined {
  const cached = highlight.translation_cache[targetLang];
  if (cached === undefined || cached.trim() === '') {
    return undefined;
  }
  return cached;
}

export async function translateHighlightText(
  text: string,
  targetLang: string,
): Promise<string> {
  const apiKey = await getApiKey();
  if (apiKey === null) {
    throw new Error('API key not set');
  }

  const prompt = buildTranslationPrompt(text, targetLang);
  const response = await callGemini(prompt, { feature: 'translation' });
  const translated = parseTranslationResponse(response);
  if (translated === '') {
    throw new Error('Empty translation');
  }
  return translated;
}

export function mergeTranslationCache(
  highlight: Highlight,
  targetLang: string,
  translation: string,
): Record<string, string> {
  return {
    ...highlight.translation_cache,
    [targetLang]: translation,
  };
}
