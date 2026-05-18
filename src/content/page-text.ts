import { extractPageTextFromInnerText } from '../shared/ai/page-summary.js';

export function getPageTextForSummary(): { text: string; truncated: boolean } {
  const innerText = document.body?.innerText ?? '';
  return extractPageTextFromInnerText(innerText);
}
