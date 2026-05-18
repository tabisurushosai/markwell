import { describe, expect, it } from 'vitest';

import packageJson from '../package.json' with { type: 'json' };
import {
  MARKWELL_OSS_LICENSES_URL,
  MARKWELL_PRIVACY_POLICY_URL,
  MARKWELL_REPOSITORY_URL,
  MARKWELL_SUPPORT_EMAIL,
  MARKWELL_SUPPORT_MAILTO,
  MARKWELL_TERMS_URL,
} from '../src/shared/constants/about.js';
import { APP_VERSION } from '../src/shared/constants/version.js';

describe('about constants', () => {
  it('APP_VERSION reads package.json version', () => {
    expect(APP_VERSION).toBe(packageJson.version);
    expect(APP_VERSION).not.toBe('');
  });

  it('exposes placeholder repository and legal links', () => {
    expect(MARKWELL_REPOSITORY_URL).toMatch(/^https:\/\/github\.com\//);
    expect(MARKWELL_PRIVACY_POLICY_URL).toContain(MARKWELL_REPOSITORY_URL);
    expect(MARKWELL_TERMS_URL).toContain(MARKWELL_REPOSITORY_URL);
    expect(MARKWELL_OSS_LICENSES_URL).toContain(MARKWELL_REPOSITORY_URL);
    expect(MARKWELL_SUPPORT_EMAIL).toBe('tabisurushosai+markwell@gmail.com');
    expect(MARKWELL_SUPPORT_MAILTO).toBe(`mailto:${MARKWELL_SUPPORT_EMAIL}`);
  });
});
