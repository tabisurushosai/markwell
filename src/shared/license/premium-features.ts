import { AI_USAGE_FEATURE_LABELS } from '../ai/usage.js';
import type { AiFeature } from './ai-access.js';

export type PremiumCatalogItem = {
  feature?: AiFeature;
  label: string;
  tierNote: string;
};

/** Premium 解放モーダルに表示する機能一覧 */
export const PREMIUM_FEATURE_CATALOG: readonly PremiumCatalogItem[] = [
  { feature: 'synthesis', label: AI_USAGE_FEATURE_LABELS.synthesis, tierNote: 'Trial 以上' },
  { feature: 'auto_tag', label: AI_USAGE_FEATURE_LABELS.auto_tag, tierNote: 'Trial 以上' },
  { feature: 'related', label: AI_USAGE_FEATURE_LABELS.related_highlights, tierNote: 'Trial 以上' },
  { feature: 'qa', label: AI_USAGE_FEATURE_LABELS.qa, tierNote: 'Trial 以上' },
  { feature: 'page_summary', label: AI_USAGE_FEATURE_LABELS.page_summary, tierNote: 'Trial 以上' },
  { feature: 'quote_extract', label: AI_USAGE_FEATURE_LABELS.quote_extractor, tierNote: 'Trial 以上' },
  { feature: 'rephrase', label: AI_USAGE_FEATURE_LABELS.rephrase, tierNote: 'Trial 以上' },
  { label: 'ハイライト最大 5,000 件', tierNote: 'Premium' },
  { label: 'プロジェクト無制限', tierNote: 'Premium' },
  { feature: 'fact_check', label: AI_USAGE_FEATURE_LABELS.fact_check, tierNote: 'Premium のみ' },
  { label: 'Obsidian / Roam 形式エクスポート', tierNote: 'Premium のみ' },
];

export function findPremiumCatalogItem(feature: AiFeature): PremiumCatalogItem | undefined {
  return PREMIUM_FEATURE_CATALOG.find((item) => item.feature === feature);
}
