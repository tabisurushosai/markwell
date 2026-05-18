import type { Highlight } from '../types/highlight.js';

/** userInstruction が空のときの既定指示 */
export const DEFAULT_SYNTHESIS_INSTRUCTION =
  'これらのハイライトの共通テーマを抽出し、論考としてまとめてください';

/** 1 文字 ≈ 0.7 token（概算） */
const CHARS_PER_TOKEN = 1 / 0.7;

export const SYNTHESIS_TOKEN_WARNING_THRESHOLD = 8000;

export function estimateTokens(text: string): number {
  return text.length / CHARS_PER_TOKEN;
}

export function getSynthesisTokenWarning(text: string): string | null {
  const estimated = estimateTokens(text);
  if (estimated <= SYNTHESIS_TOKEN_WARNING_THRESHOLD) {
    return null;
  }
  return `このプロンプトは概算 ${Math.round(estimated)} トークンです（上限の目安: ${SYNTHESIS_TOKEN_WARNING_THRESHOLD}）。ハイライトを減らすか、指示を短くしてください。`;
}

function resolveInstruction(userInstruction: string): string {
  const trimmed = userInstruction.trim();
  return trimmed === '' ? DEFAULT_SYNTHESIS_INSTRUCTION : trimmed;
}

function formatHighlightEntry(index: number, highlight: Highlight): string {
  const number = index + 1;
  return `[${number}] ${highlight.selected_text} (出典: ${highlight.page_title}, ${highlight.domain})
    ノート: ${highlight.note}`;
}

export function buildSynthesisPrompt(
  highlights: Highlight[],
  userInstruction: string,
): string {
  const instruction = resolveInstruction(userInstruction);
  const count = highlights.length;
  const entries = highlights.map((highlight, index) => formatHighlightEntry(index, highlight));

  const highlightSection =
    entries.length > 0 ? entries.join('\n') : '（ハイライトなし）';

  return `あなたは熟練のリサーチアシスタントです。以下は私が Web 上から集めた ${count} 件のハイライトです。
これらを統合し、次の指示に従って論考としてまとめてください。

指示: ${instruction}

ハイライト:
${highlightSection}

出力形式: 日本語の Markdown。各論点ごとに見出し + 関連するハイライト番号 [N] を引用形式で本文中に挿入。`;
}
