import type { AiFeature } from '../license/ai-access.js';
import { findPremiumCatalogItem } from '../license/premium-features.js';

export function getAiFeatureDisplayName(feature: AiFeature): string {
  return findPremiumCatalogItem(feature)?.label ?? feature;
}

export function buildUpgradeModalMessage(featureName: string, limit: number | null): string {
  if (limit !== null) {
    return `「${featureName}」の上限（${String(limit)} 件）に達しました。Premium で上限を引き上げられます。`;
  }
  return `「${featureName}」を利用するには Premium（または無料トライアル）が必要です。`;
}
