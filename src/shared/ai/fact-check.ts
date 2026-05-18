import { callGeminiWithGoogleSearch, type GeminiGroundedResult } from './gemini.js';
import { assertAiAccess, canUseAiFeature } from '../license/ai-access.js';
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
  return canUseAiFeature(tier, 'fact_check');
}

export function getFactCheckButtonLabel(tier: LicenseTier): string {
  const label = '🔎 ファクトチェック';
  return canUseFactCheck(tier) ? label : `🔒 ${label}`;
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
  assertAiAccess(tier, 'fact_check');

  const apiKey = await getApiKey();
  if (apiKey === null) {
    throw new Error('API key not set');
  }

  const trimmed = text.trim();
  if (trimmed === '') {
    throw new Error('empty text');
  }

  const grounded = await callGeminiWithGoogleSearch(buildFactCheckPrompt(trimmed), {
    feature: 'fact_check',
  });
  const result = toFactCheckResult(grounded);
  if (result.answer === '') {
    throw new Error('Empty fact check response');
  }
  return result;
}
