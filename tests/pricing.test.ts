import { describe, expect, it } from 'vitest';

import {
  estimateTokenCostUsd,
  formatUsdEstimate,
  GEMINI_FLASH_PRICING,
} from '../src/shared/ai/pricing.js';

describe('pricing', () => {
  it('estimateTokenCostUsd uses per-million rates', () => {
    const cost = estimateTokenCostUsd(1_000_000, 1_000_000, GEMINI_FLASH_PRICING);
    expect(cost).toBeCloseTo(0.5, 6);
  });

  it('formatUsdEstimate shows small amounts with extra precision', () => {
    expect(formatUsdEstimate(0)).toBe('$0.00');
    expect(formatUsdEstimate(0.0042)).toBe('$0.0042');
    expect(formatUsdEstimate(1.23)).toBe('$1.23');
  });
});
