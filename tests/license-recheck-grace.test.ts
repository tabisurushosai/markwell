import { describe, expect, it } from 'vitest';

import { LICENSE_RECHECK_GRACE_MS } from '../src/shared/license/constants.js';
import { isWithinLicenseRecheckGrace } from '../src/shared/license/recheck-grace.js';

describe('license recheck grace', () => {
  it('is false when last_verified_at is null', () => {
    expect(isWithinLicenseRecheckGrace({ last_verified_at: null }, 1_000_000)).toBe(false);
  });

  it('is true within LICENSE_RECHECK_GRACE_MS after last verify', () => {
    const now = 10_000_000;
    const last = now - LICENSE_RECHECK_GRACE_MS + 1;
    expect(isWithinLicenseRecheckGrace({ last_verified_at: last }, now)).toBe(true);
  });

  it('is false after grace period elapsed', () => {
    const now = 10_000_000;
    const last = now - LICENSE_RECHECK_GRACE_MS;
    expect(isWithinLicenseRecheckGrace({ last_verified_at: last }, now)).toBe(false);
  });
});
