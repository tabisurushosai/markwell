import { callGemini } from './gemini.js';
import { getApiKey } from '../storage/settings.js';
import type { LicenseTier } from '../storage/highlights.js';

export type RephraseStyle = 'polite' | 'concise' | 'academic' | 'casual';

export const REPHRASE_STYLES: ReadonlyArray<{ id: RephraseStyle; label: string }> = [
  { id: 'polite', label: '丁寧' },
  { id: 'concise', label: '簡潔' },
  { id: 'academic', label: '学術調' },
  { id: 'casual', label: 'カジュアル' },
];

const STYLE_INSTRUCTIONS: Record<RephraseStyle, string> = {
  polite: '丁寧で敬体の文体',
  concise: '簡潔で要点を押さえた文体',
  academic: '学術的でフォーマルな文体',
  casual: 'カジュアルで親しみやすい文体',
};

export function canUseRephrase(tier: LicenseTier): boolean {
  return tier === 'trial' || tier === 'premium';
}

export function getRephraseStyleLabel(style: RephraseStyle): string {
  return REPHRASE_STYLES.find((item) => item.id === style)?.label ?? style;
}

export function buildRephrasePrompt(text: string, style: RephraseStyle): string {
  const instruction = STYLE_INSTRUCTIONS[style];
  return `次のテキストを${instruction}で言い換えてください。意味は保ち、言い換え文のみを返答し、前置きや説明は付けないでください。

${text}`;
}

export function parseRephraseResponse(response: string): string {
  return response.trim();
}

export async function rephraseHighlightText(
  text: string,
  style: RephraseStyle,
): Promise<string> {
  const apiKey = await getApiKey();
  if (apiKey === null) {
    throw new Error('API key not set');
  }

  const trimmed = text.trim();
  if (trimmed === '') {
    throw new Error('empty text');
  }

  const response = await callGemini(buildRephrasePrompt(trimmed, style));
  const rephrased = parseRephraseResponse(response);
  if (rephrased === '') {
    throw new Error('Empty rephrase');
  }
  return rephrased;
}
