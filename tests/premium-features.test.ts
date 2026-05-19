import { describe, expect, it } from 'vitest';

import {
  findPremiumCatalogItem,
  getPremiumFeatureCatalog,
} from '../src/shared/license/premium-features.js';

describe('premium-features', () => {
  it('lists catalog items for unlock modal', () => {
    const catalog = getPremiumFeatureCatalog();
    expect(catalog.length).toBeGreaterThan(5);
    expect(catalog.some((item) => item.feature === 'synthesis')).toBe(true);
    expect(catalog.some((item) => item.feature === 'fact_check')).toBe(true);
  });

  it('finds catalog item by feature id', () => {
    const item = findPremiumCatalogItem('rephrase');
    expect(item?.label).toContain('Rephrase');
  });
});
