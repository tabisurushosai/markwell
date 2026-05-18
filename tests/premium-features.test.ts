import { describe, expect, it } from 'vitest';

import { findPremiumCatalogItem, PREMIUM_FEATURE_CATALOG } from '../src/shared/license/premium-features.js';

describe('premium-features', () => {
  it('lists catalog items for unlock modal', () => {
    expect(PREMIUM_FEATURE_CATALOG.length).toBeGreaterThan(5);
    expect(PREMIUM_FEATURE_CATALOG.some((item) => item.feature === 'synthesis')).toBe(true);
    expect(PREMIUM_FEATURE_CATALOG.some((item) => item.feature === 'fact_check')).toBe(true);
  });

  it('finds catalog item by feature id', () => {
    const item = findPremiumCatalogItem('rephrase');
    expect(item?.label).toContain('言い換え');
  });
});
