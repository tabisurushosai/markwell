import type { Highlight } from '../types/highlight.js';
import type { LicenseTier } from '../storage/highlights.js';

export const QUOTE_EXTRACT_COUNT = 5;

export function canUseQuoteExtractor(tier: LicenseTier): boolean {
  return tier === 'premium' || tier === 'trial';
}

export function formatHighlightsForQuoteExtractor(highlights: Highlight[]): string {
  if (highlights.length === 0) {
    return '（ハイライトなし）';
  }
  return highlights
    .map((highlight, index) => {
      const number = index + 1;
      const note =
        highlight.note.trim() === '' ? '' : `\n   メモ: ${highlight.note.trim()}`;
      return `[${number}] ${highlight.selected_text}\n   (${highlight.page_title} · ${highlight.domain})${note}`;
    })
    .join('\n\n');
}

export function resolveQuoteExtractCount(highlightCount: number): number {
  if (highlightCount <= 0) {
    return 0;
  }
  return Math.min(QUOTE_EXTRACT_COUNT, highlightCount);
}

export function buildQuoteExtractorPrompt(highlights: Highlight[]): string {
  const pickCount = resolveQuoteExtractCount(highlights.length);
  const context = formatHighlightsForQuoteExtractor(highlights);

  return `以下のハイライトから、最も印象的な引用を${String(pickCount)}件選んでください。

出力形式（日本語 Markdown）:
- 各引用は ## 見出し（短い要約）、本文は > ブロッククォート、直後に「出典: [番号] ページタイトル · ドメイン」の1行
- 候補の selected_text を改変せずそのまま引用すること
- 候補にない内容を捏造しない
- ちょうど ${String(pickCount)} 件

候補:
${context}`;
}

export function buildQuoteDownloadFilename(createdAt: number): string {
  const date = new Date(createdAt);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp = `${String(date.getUTCFullYear())}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
  return `markwell-quotes-${stamp}.md`;
}
