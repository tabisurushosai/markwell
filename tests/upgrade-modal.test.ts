import { describe, expect, it } from 'vitest';

import {
  buildUpgradeModalMessage,
  getAiFeatureDisplayName,
} from '../src/shared/components/upgrade-modal-helpers.js';

describe('upgrade-modal-helpers', () => {
  it('builds limit message with feature name and cap', () => {
    expect(buildUpgradeModalMessage('Highlight save', 50)).toContain('50');
    expect(buildUpgradeModalMessage('Highlight save', 50)).toContain('Highlight save');
  });

  it('builds feature lock message without limit', () => {
    const message = buildUpgradeModalMessage('AI synthesis', null);
    expect(message).toContain('AI synthesis');
    expect(message).not.toContain('reached the limit');
  });

  it('resolves AI feature display name', () => {
    expect(getAiFeatureDisplayName('synthesis')).toBe('Synthesis');
  });
});
