import type { AiFeature } from '../license/ai-access.js';
import { hasUsedTrial } from '../license/start-trial.js';
import { getAiFeatureDisplayName } from './upgrade-modal-helpers.js';

export type UpgradeModalHostState = {
  open: boolean;
  featureName: string;
  limit: number | null;
  highlightFeature: AiFeature | null;
  showFeatureList: boolean;
  trialUsed: boolean;
};

export const CLOSED_UPGRADE_MODAL_STATE: UpgradeModalHostState = {
  open: false,
  featureName: '',
  limit: null,
  highlightFeature: null,
  showFeatureList: false,
  trialUsed: true,
};

export async function buildUpgradeModalHostState(input: {
  featureName?: string;
  limit?: number | null;
  highlightFeature?: AiFeature | null;
  showFeatureList?: boolean;
}): Promise<UpgradeModalHostState> {
  const highlightFeature = input.highlightFeature ?? null;
  const featureName =
    input.featureName ??
    (highlightFeature !== null ? getAiFeatureDisplayName(highlightFeature) : 'Premium');

  return {
    open: true,
    featureName,
    limit: input.limit ?? null,
    highlightFeature,
    showFeatureList: input.showFeatureList ?? highlightFeature !== null,
    trialUsed: await hasUsedTrial(),
  };
}
