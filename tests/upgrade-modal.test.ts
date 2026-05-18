import { describe, expect, it } from 'vitest';

import {
  buildUpgradeModalMessage,
  getAiFeatureDisplayName,
} from '../src/shared/components/upgrade-modal-helpers.js';

describe('upgrade-modal-helpers', () => {
  it('builds limit message with feature name and cap', () => {
    expect(buildUpgradeModalMessage('ハイライト保存', 50)).toContain('50 件');
    expect(buildUpgradeModalMessage('ハイライト保存', 50)).toContain('ハイライト保存');
  });

  it('builds feature lock message without limit', () => {
    const message = buildUpgradeModalMessage('AI 合成', null);
    expect(message).toContain('AI 合成');
    expect(message).not.toContain('件）に達しました');
  });

  it('resolves AI feature display name', () => {
    expect(getAiFeatureDisplayName('synthesis')).toBe('合成');
  });
});
