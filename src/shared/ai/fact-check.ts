import { callGeminiWithGoogleSearch, type GeminiGroundedResult } from './gemini.js';
import type { LicenseTier } from '../storage/highlights.js';
import { getCurrentTier } from '../storage/license.js';
import { getApiKey } from '../storage/settings.js';

export type FactCheckSource = {
  title: string;
  uri: string;
};

export type FactCheckResult = {
  answer: string;
  sources: FactCheckSource[];
  webSearchQueries: string[];
};

export function canUseFactCheck(tier: LicenseTier): boolean {
  return tier === 'premium';
}

export function getFactCheckButtonLabel(tier: LicenseTier): string {
  return canUseFactCheck(tier) ? '🔎 ファクトチェック' : '🔎 Premium 機能';
}

export function buildFactCheckPrompt(selectedText: string): string {
  return `次のテキストの事実関係を web 検索で確認してください: ${selectedText.trim()}`;
}

export function toFactCheckResult(grounded: GeminiGroundedResult): FactCheckResult {
  return {
    answer: grounded.text.trim(),
    sources: grounded.sources,
    webSearchQueries: grounded.webSearchQueries,
  };
}

export function formatFactCheckForCopy(result: FactCheckResult): string {
  const lines = [result.answer];
  if (result.sources.length > 0) {
    lines.push('', '出典:');
    for (const source of result.sources) {
      lines.push(`- ${source.title} (${source.uri})`);
    }
  }
  return lines.join('\n');
}

export async function factCheckHighlightText(text: string): Promise<FactCheckResult> {
  const tier = await getCurrentTier();
  if (!canUseFactCheck(tier)) {
    throw new Error('Premium required');
  }

  const apiKey = await getApiKey();
  if (apiKey === null) {
    throw new Error('API key not set');
  }

  const trimmed = text.trim();
  if (trimmed === '') {
    throw new Error('empty text');
  }

  const grounded = await callGeminiWithGoogleSearch(buildFactCheckPrompt(trimmed));
  const result = toFactCheckResult(grounded);
  if (result.answer === '') {
    throw new Error('Empty fact check response');
  }
  return result;
}
