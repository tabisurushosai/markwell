import type { Highlight } from '../types/highlight.js';
import { t } from '../utils/i18n.js';

/** Default synthesis instruction when userInstruction is empty. */
export function getDefaultSynthesisInstruction(): string {
  return t('synthesis_default_instruction');
}

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
  return t('synthesis_token_warning', [
    String(Math.round(estimated)),
    String(SYNTHESIS_TOKEN_WARNING_THRESHOLD),
  ]);
}

function resolveInstruction(userInstruction: string): string {
  const trimmed = userInstruction.trim();
  return trimmed === '' ? getDefaultSynthesisInstruction() : trimmed;
}

/** 保存済みプロンプトから userInstruction を復元（既定指示のときは空文字） */
export function extractUserInstructionFromPrompt(savedPrompt: string): string {
  const match = savedPrompt.match(/^指示: (.+)$/m);
  if (match === null) {
    return '';
  }
  const instruction = match[1]?.trim() ?? '';
  if (instruction === getDefaultSynthesisInstruction()) {
    return '';
  }
  return instruction;
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
