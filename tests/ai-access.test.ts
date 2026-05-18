import { describe, expect, it } from 'vitest';

import {
  AiAccessError,
  assertAiAccess,
  canUseAiFeature,
  formatAiButtonLabel,
  getAiFeatureLockTooltip,
} from '../src/shared/license/ai-access.js';

describe('ai-access', () => {
  it('allows translation on free tier', () => {
    expect(canUseAiFeature('free', 'translation')).toBe(true);
    expect(() => assertAiAccess('free', 'translation')).not.toThrow();
  });

  it('requires trial for synthesis', () => {
    expect(canUseAiFeature('free', 'synthesis')).toBe(false);
    expect(canUseAiFeature('trial', 'synthesis')).toBe(true);
    expect(() => assertAiAccess('free', 'synthesis')).toThrow(AiAccessError);
  });

  it('requires premium for fact_check', () => {
    expect(canUseAiFeature('trial', 'fact_check')).toBe(false);
    expect(canUseAiFeature('premium', 'fact_check')).toBe(true);
    expect(() => assertAiAccess('trial', 'fact_check')).toThrow(AiAccessError);
  });

  it('formats locked button label', () => {
    expect(formatAiButtonLabel('合成する', 'free', 'synthesis')).toBe('🔒 合成する');
    expect(formatAiButtonLabel('合成する', 'trial', 'synthesis')).toBe('合成する');
  });

  it('provides lock tooltips', () => {
    expect(getAiFeatureLockTooltip('fact_check')).toContain('Premium');
    expect(getAiFeatureLockTooltip('synthesis')).toContain('トライアル');
  });
});
