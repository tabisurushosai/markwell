import { callGemini } from './gemini.js';
import { assertAiAccess, canUseAiFeature } from '../license/ai-access.js';
import type { LicenseTier } from '../storage/highlights.js';
import { getCurrentTier } from '../storage/license.js';
import { getApiKey } from '../storage/settings.js';

export const PAGE_TEXT_MAX_LENGTH = 8000;

export function canUsePageSummary(tier: LicenseTier): boolean {
  return canUseAiFeature(tier, 'page_summary');
}

export function extractPageTextFromInnerText(innerText: string, maxLength = PAGE_TEXT_MAX_LENGTH): {
  text: string;
  truncated: boolean;
} {
  const text = innerText.slice(0, maxLength);
  return {
    text,
    truncated: innerText.length > maxLength,
  };
}

export function buildPageSummaryPrompt(pageText: string, pageTitle?: string): string {
  const titleLine = pageTitle?.trim() === '' ? '' : `ページタイトル: ${pageTitle?.trim()}\n\n`;
  return `${titleLine}以下は Web ページの本文です。内容を日本語で 3〜5 行に要約してください。箇条書きでも段落でも構いません。

本文:
${pageText}`;
}

export async function summarizePageText(pageText: string, pageTitle?: string): Promise<string> {
  const tier = await getCurrentTier();
  assertAiAccess(tier, 'page_summary');

  const apiKey = await getApiKey();
  if (apiKey === null) {
    throw new Error('API key not set');
  }

  const trimmed = pageText.trim();
  if (trimmed === '') {
    throw new Error('empty page text');
  }

  const summary = await callGemini(buildPageSummaryPrompt(trimmed, pageTitle), {
    feature: 'page_summary',
  });
  const result = summary.trim();
  if (result === '') {
    throw new Error('Empty page summary');
  }
  return result;
}
