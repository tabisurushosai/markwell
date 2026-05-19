import type { LicenseTier } from '../storage/highlights.js';
import { t } from '../utils/i18n.js';

export type AiFeature =
  | 'synthesis'
  | 'auto_tag'
  | 'related'
  | 'qa'
  | 'page_summary'
  | 'quote_extract'
  | 'rephrase'
  | 'translation'
  | 'fact_check';

const MIN_TIER_FOR_FEATURE: Record<AiFeature, LicenseTier> = {
  synthesis: 'trial',
  auto_tag: 'trial',
  related: 'trial',
  qa: 'trial',
  page_summary: 'trial',
  quote_extract: 'trial',
  rephrase: 'trial',
  translation: 'free',
  fact_check: 'premium',
};

const TIER_RANK: Record<LicenseTier, number> = {
  free: 0,
  trial: 1,
  premium: 2,
};

export class AiAccessError extends Error {
  readonly feature: AiFeature;
  readonly tier: LicenseTier;
  readonly requiredTier: LicenseTier;

  constructor(feature: AiFeature, tier: LicenseTier) {
    const requiredTier = MIN_TIER_FOR_FEATURE[feature];
    super(`AI feature "${feature}" requires ${requiredTier} tier (current: ${tier})`);
    this.name = 'AiAccessError';
    this.feature = feature;
    this.tier = tier;
    this.requiredTier = requiredTier;
  }
}

export function canUseAiFeature(tier: LicenseTier, feature: AiFeature): boolean {
  return TIER_RANK[tier] >= TIER_RANK[MIN_TIER_FOR_FEATURE[feature]];
}

export function assertAiAccess(tier: LicenseTier, feature: AiFeature): void {
  if (!canUseAiFeature(tier, feature)) {
    throw new AiAccessError(feature, tier);
  }
}

export function getAiFeatureLockTooltip(feature: AiFeature): string {
  const required = MIN_TIER_FOR_FEATURE[feature];
  if (required === 'premium') {
    return t('ai_access_lock_tooltip_premium');
  }
  if (required === 'trial') {
    return t('ai_access_lock_tooltip_trial');
  }
  return '';
}

export function formatAiButtonLabel(
  label: string,
  tier: LicenseTier,
  feature: AiFeature,
): string {
  return canUseAiFeature(tier, feature) ? label : `🔒 ${label}`;
}

export function formatAiButtonTitle(
  unlockedTitle: string,
  tier: LicenseTier,
  feature: AiFeature,
): string {
  if (canUseAiFeature(tier, feature)) {
    return unlockedTitle;
  }
  const lockHint = getAiFeatureLockTooltip(feature);
  return lockHint === '' ? unlockedTitle : lockHint;
}
