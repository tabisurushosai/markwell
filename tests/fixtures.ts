import type { LicenseStatus } from '../src/shared/types/license.js';
import type { Settings } from '../src/shared/types/settings.js';

export const TEST_LICENSE_STATUS: LicenseStatus = {
  tier: 'trial',
  license_key: null,
  trial_start: Date.now() - 86_400_000,
  trial_end: Date.now() + 6 * 86_400_000,
  last_verified_at: null,
  verify_failure_count: 0,
  license_revoked_at: null,
  license_revoked_reason: null,
};

export const TEST_SETTINGS: Settings = {
  default_color: 'yellow',
  theme: 'dark',
  font_scale: 1,
  density: 'normal',
  blocked_domains: [],
  blocked_url_patterns: [],
  ai: {
    provider: 'gemini',
    api_key_encrypted: 'enc',
    model: 'gemini-2.0-flash',
    auto_tag_on_save: true,
  },
  shortcuts: {
    quick_highlight: 'Alt+H',
    open_synthesis: 'Alt+S',
  },
  translate_target_lang: 'ja',
  stripe_payment_link: '',
  onboarding_seen: false,
};
