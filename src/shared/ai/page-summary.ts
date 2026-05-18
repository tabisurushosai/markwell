import type { LicenseTier } from '../storage/highlights.js';

export const PAGE_TEXT_MAX_LENGTH = 8000;

export function canUsePageSummary(tier: LicenseTier): boolean {
  return tier === 'premium' || tier === 'trial';
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
