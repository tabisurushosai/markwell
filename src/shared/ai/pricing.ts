/** Gemini 2.0 Flash 公式料金（USD / 1M tokens）。最終確認: 2026-05-18 */
export const GEMINI_FLASH_PRICING = {
  model: 'gemini-2.0-flash',
  input_per_million_usd: 0.1,
  output_per_million_usd: 0.4,
  last_verified: '2026-05-18',
} as const;

export type TokenPricing = {
  input_per_million_usd: number;
  output_per_million_usd: number;
};

export function estimateTokenCostUsd(
  tokenInput: number,
  tokenOutput: number,
  pricing: TokenPricing = GEMINI_FLASH_PRICING,
): number {
  const input = Math.max(0, tokenInput);
  const output = Math.max(0, tokenOutput);
  const inputCost = (input / 1_000_000) * pricing.input_per_million_usd;
  const outputCost = (output / 1_000_000) * pricing.output_per_million_usd;
  return inputCost + outputCost;
}

export function formatUsdEstimate(amount: number): string {
  if (amount === 0) {
    return '$0.00';
  }
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(2)}`;
}
