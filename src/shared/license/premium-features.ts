import { getAiUsageFeatureLabel } from '../ai/usage.js';
import { t } from '../utils/i18n.js';
import type { AiFeature } from './ai-access.js';

export type PremiumCatalogItem = {
  feature?: AiFeature;
  label: string;
  tierNote: string;
};

/** Premium unlock modal feature list (locale-aware). */
export function getPremiumFeatureCatalog(): readonly PremiumCatalogItem[] {
  return [
    { feature: 'synthesis', label: getAiUsageFeatureLabel('synthesis'), tierNote: t('tier_note_trial_or_above') },
    { feature: 'auto_tag', label: getAiUsageFeatureLabel('auto_tag'), tierNote: t('tier_note_trial_or_above') },
    {
      feature: 'related',
      label: getAiUsageFeatureLabel('related_highlights'),
      tierNote: t('tier_note_trial_or_above'),
    },
    { feature: 'qa', label: getAiUsageFeatureLabel('qa'), tierNote: t('tier_note_trial_or_above') },
    {
      feature: 'page_summary',
      label: getAiUsageFeatureLabel('page_summary'),
      tierNote: t('tier_note_trial_or_above'),
    },
    {
      feature: 'quote_extract',
      label: getAiUsageFeatureLabel('quote_extractor'),
      tierNote: t('tier_note_trial_or_above'),
    },
    { feature: 'rephrase', label: getAiUsageFeatureLabel('rephrase'), tierNote: t('tier_note_trial_or_above') },
    { label: t('premium_catalog_highlights_limit'), tierNote: t('tier_note_premium') },
    { label: t('premium_catalog_unlimited_projects'), tierNote: t('tier_note_premium') },
    { feature: 'fact_check', label: getAiUsageFeatureLabel('fact_check'), tierNote: t('tier_note_premium_only') },
    { label: t('premium_catalog_obsidian_roam_export'), tierNote: t('tier_note_premium_only') },
  ];
}

export function findPremiumCatalogItem(feature: AiFeature): PremiumCatalogItem | undefined {
  return getPremiumFeatureCatalog().find((item) => item.feature === feature);
}
