import type { GeminiChatTurn } from './gemini.js';
import type { Highlight } from '../types/highlight.js';
import type { LicenseTier } from '../storage/highlights.js';

/** Gemini への system 相当の指示 */
export const PROJECT_QA_SYSTEM_PROMPT =
  'あなたはユーザーが集めたハイライトに基づいて質問に答える。引用時は [{番号}] でハイライトを参照';

export type QaChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function canUseProjectQa(tier: LicenseTier): boolean {
  return tier === 'premium' || tier === 'trial';
}

export function formatHighlightsForQa(highlights: Highlight[]): string {
  if (highlights.length === 0) {
    return '（ハイライトなし）';
  }
  return highlights
    .map((highlight, index) => {
      const number = index + 1;
      const note =
        highlight.note.trim() === '' ? '' : `\n   メモ: ${highlight.note.trim()}`;
      return `[${number}] ${highlight.selected_text} (${highlight.page_title} · ${highlight.domain})${note}`;
    })
    .join('\n');
}

export function buildProjectQaPrompt(
  highlights: Highlight[],
  history: QaChatMessage[],
  userMessage: string,
): string {
  const context = formatHighlightsForQa(highlights);
  const historyBlock = history
    .map((message) =>
      message.role === 'user'
        ? `ユーザー: ${message.content}`
        : `アシスタント: ${message.content}`,
    )
    .join('\n\n');

  const sections = [
    PROJECT_QA_SYSTEM_PROMPT,
    '',
    '以下はこのプロジェクトのハイライトです:',
    context,
  ];

  if (historyBlock !== '') {
    sections.push('', 'これまでの会話:', historyBlock);
  }

  sections.push('', `ユーザー: ${userMessage}`, '', 'アシスタント:');
  return sections.join('\n');
}

/** systemInstruction: 指示 + プロジェクト内ハイライト一覧 */
export function buildProjectQaSystemInstruction(highlights: Highlight[]): string {
  return `${PROJECT_QA_SYSTEM_PROMPT}

以下はこのプロジェクトのハイライトです:
${formatHighlightsForQa(highlights)}`;
}

/** セッション内メッセージを Gemini ターンに変換（空の assistant は除外） */
export function buildGeminiTurnsFromSession(messages: QaChatMessage[]): GeminiChatTurn[] {
  return messages
    .filter((message) => message.content.trim() !== '')
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      text: message.content,
    }));
}
