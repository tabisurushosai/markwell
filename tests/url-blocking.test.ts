import { describe, expect, it } from 'vitest';

import { isDomainBlocked, isPageBlocked, isUrlPatternBlocked } from '../src/shared/utils/url.js';

describe('url blocking', () => {
  it('isDomainBlocked matches exact and subdomain', () => {
    expect(isDomainBlocked('example.com', ['example.com'])).toBe(true);
    expect(isDomainBlocked('www.example.com', ['example.com'])).toBe(true);
    expect(isDomainBlocked('notexample.com', ['example.com'])).toBe(false);
  });

  it('isDomainBlocked matches localhost and loopback port wildcards', () => {
    expect(isDomainBlocked('localhost', ['localhost:*'])).toBe(true);
    expect(isDomainBlocked('127.0.0.1', ['127.0.0.1:*'])).toBe(true);
    expect(isDomainBlocked('example.com', ['localhost:*'])).toBe(false);
  });

  it('isDomainBlocked matches default chrome store domains', () => {
    expect(isDomainBlocked('chrome.google.com', ['chrome.google.com'])).toBe(true);
    expect(isDomainBlocked('chromewebstore.google.com', ['chromewebstore.google.com'])).toBe(true);
  });

  it('isDomainBlocked matches localhost and loopback port wildcards', () => {
    expect(isDomainBlocked('localhost', ['localhost:*'])).toBe(true);
    expect(isDomainBlocked('127.0.0.1', ['127.0.0.1:*'])).toBe(true);
    expect(isDomainBlocked('example.com', ['localhost:*'])).toBe(false);
  });

  it('isPageBlocked blocks default chrome and localhost domains', () => {
    expect(
      isPageBlocked(
        'https://chrome.google.com/webstore',
        'chrome.google.com',
        ['chrome.google.com', 'chromewebstore.google.com', 'localhost:*', '127.0.0.1:*'],
        [],
      ),
    ).toBe(true);
    expect(
      isPageBlocked('http://localhost:3000/', 'localhost', ['localhost:*'], []),
    ).toBe(true);
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
