import { describe, expect, it } from 'vitest';

import { isDomainBlocked, isPageBlocked, isUrlPatternBlocked } from '../src/shared/utils/url.js';

describe('url blocking', () => {
  it('isDomainBlocked matches exact and subdomain', () => {
    expect(isDomainBlocked('example.com', ['example.com'])).toBe(true);
    expect(isDomainBlocked('www.example.com', ['example.com'])).toBe(true);
    expect(isDomainBlocked('notexample.com', ['example.com'])).toBe(false);
  });

  it('isUrlPatternBlocked uses regular expressions', () => {
    expect(isUrlPatternBlocked('https://example.com/private', ['^https://example\\.com/private'])).toBe(
      true,
    );
    expect(isUrlPatternBlocked('https://example.com/public', ['^https://example\\.com/private'])).toBe(
      false,
    );
    expect(isUrlPatternBlocked('https://example.com', ['[invalid'])).toBe(false);
  });

  it('isPageBlocked combines domain and pattern checks', () => {
    expect(
      isPageBlocked('https://blocked.com/page', 'blocked.com', ['blocked.com'], []),
    ).toBe(true);
    expect(
      isPageBlocked(
        'https://safe.com/secret',
        'safe.com',
        [],
        ['^https://safe\\.com/secret'],
      ),
    ).toBe(true);
  });
});
