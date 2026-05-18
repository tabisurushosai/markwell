import { z } from 'zod';

import { kvDelete, kvGet, kvSet } from '../storage/kv.js';

export const AI_USAGE_FEATURES = [
  'synthesis',
  'auto_tag',
  'translation',
  'rephrase',
  'fact_check',
  'page_summary',
  'related_highlights',
  'quote_extractor',
  'qa',
] as const;

export type AiUsageFeature = (typeof AI_USAGE_FEATURES)[number];

export const AI_USAGE_FEATURE_LABELS: Record<AiUsageFeature, string> = {
  synthesis: '合成',
  auto_tag: '自動タグ',
  translation: '翻訳',
  rephrase: '言い換え',
  fact_check: 'ファクトチェック',
  page_summary: 'ページ要約',
  related_highlights: '関連ハイライト',
  quote_extractor: '引用抽出',
  qa: 'Q&A',
};

const FeatureUsageSchema = z.object({
  request_count: z.number().int().nonnegative(),
  token_input: z.number().int().nonnegative(),
  token_output: z.number().int().nonnegative(),
});

export type FeatureUsage = z.infer<typeof FeatureUsageSchema>;

const MonthlyUsageSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  request_count: z.number().int().nonnegative(),
  token_input: z.number().int().nonnegative(),
  token_output: z.number().int().nonnegative(),
  by_feature: z.record(FeatureUsageSchema),
  by_model: z.record(FeatureUsageSchema),
});

export type MonthlyUsageRecord = z.infer<typeof MonthlyUsageSchema>;

export type RecordUsageParams = {
  model: string;
  token_input: number;
  token_output: number;
  feature: AiUsageFeature;
};

const USAGE_KEY_PREFIX = 'markwell:usage:';
const CHARS_PER_TOKEN = 1 / 0.7;

export function currentUsageMonth(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function usageStorageKey(month: string): string {
  return `${USAGE_KEY_PREFIX}${month}`;
}

export function estimateTokensForUsage(text: string): number {
  return Math.round(text.length / CHARS_PER_TOKEN);
}

function emptyFeatureUsage(): FeatureUsage {
  return {
    request_count: 0,
    token_input: 0,
    token_output: 0,
  };
}

export function createEmptyMonthlyUsage(month: string): MonthlyUsageRecord {
  return {
    month,
    request_count: 0,
    token_input: 0,
    token_output: 0,
    by_feature: {},
    by_model: {},
  };
}

function normalizeTokenCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}

function incrementUsageBucket(
  buckets: Record<string, FeatureUsage>,
  key: string,
  tokenInput: number,
  tokenOutput: number,
): Record<string, FeatureUsage> {
  const current = buckets[key] ?? emptyFeatureUsage();
  return {
    ...buckets,
    [key]: {
      request_count: current.request_count + 1,
      token_input: current.token_input + tokenInput,
      token_output: current.token_output + tokenOutput,
    },
  };
}

export async function getMonthlyUsage(month = currentUsageMonth()): Promise<MonthlyUsageRecord> {
  const key = usageStorageKey(month);
  const stored = await kvGet(key, MonthlyUsageSchema);
  if (stored === null) {
    return createEmptyMonthlyUsage(month);
  }
  return stored;
}

export async function recordUsage(params: RecordUsageParams): Promise<void> {
  const month = currentUsageMonth();
  const key = usageStorageKey(month);
  const tokenInput = normalizeTokenCount(params.token_input);
  const tokenOutput = normalizeTokenCount(params.token_output);

  const current = (await kvGet(key, MonthlyUsageSchema)) ?? createEmptyMonthlyUsage(month);

  const next: MonthlyUsageRecord = {
    month,
    request_count: current.request_count + 1,
    token_input: current.token_input + tokenInput,
    token_output: current.token_output + tokenOutput,
    by_feature: incrementUsageBucket(current.by_feature, params.feature, tokenInput, tokenOutput),
    by_model: incrementUsageBucket(current.by_model, params.model, tokenInput, tokenOutput),
  };

  await kvSet(key, next, MonthlyUsageSchema);
}

export async function clearMonthlyUsage(month = currentUsageMonth()): Promise<void> {
  await kvDelete(usageStorageKey(month));
}
