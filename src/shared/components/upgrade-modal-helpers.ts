import type { AiFeature } from '../license/ai-access.js';
import { findPremiumCatalogItem } from '../license/premium-features.js';
import { t } from '../utils/i18n.js';

export function getAiFeatureDisplayName(feature: AiFeature): string {
  return findPremiumCatalogItem(feature)?.label ?? feature;
}

export function buildUpgradeModalMessage(featureName: string, limit: number | null): string {
  if (limit !== null) {
    return t('upgrade_modal_limit_reached', [featureName, String(limit)]);
  }
  return t('upgrade_modal_premium_required', [featureName]);
}
