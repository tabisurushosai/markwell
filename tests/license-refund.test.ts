import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_ID_STORAGE_KEY } from '../src/shared/license/device-id.js';
import {
  LICENSE_INVALID_BANNER_MESSAGE,
  LICENSE_REFUNDED_BANNER_MESSAGE,
  resolveLicenseRevokedBanner,
} from '../src/shared/license/license-revoked-banner.js';
import { runPeriodicLicenseRecheck } from '../src/shared/license/periodic-recheck.js';
import {
  LicenseRefundedError,
  verifyLicense,
} from '../src/shared/license/verify.js';
import { getLicenseStatus, setLicenseStatus } from '../src/shared/storage/license.js';

function createFakeChromeStorage() {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn((keys: string | string[] | Record<string, unknown> | null) => {
      if (keys === null) {
        return Promise.resolve(Object.fromEntries(store));
      }
      if (typeof keys === 'string') {
        return Promise.resolve(store.has(keys) ? { [keys]: store.get(keys) } : {});
      }
      if (Array.isArray(keys)) {
        return Promise.resolve(
          Object.fromEntries(keys.filter((k) => store.has(k)).map((k) => [k, store.get(k)])),
        );
      }
      return Promise.resolve({});
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
      }
      return Promise.resolve();
    }),
    dump: store,
  };
}

describe('license refund handling', () => {
  const fetchMock = vi.fn();
  let fakeStorage: ReturnType<typeof createFakeChromeStorage>;

  beforeEach(() => {
    fakeStorage = createFakeChromeStorage();
    fakeStorage.dump.set(DEVICE_ID_STORAGE_KEY, 'DEVICE123');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('chrome', {
      storage: { local: fakeStorage },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downgrades to free and throws LicenseRefundedError when reason is refunded', async () => {
    await setLicenseStatus({ tier: 'premium', license_key: 'MW-REFUND' });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valid: false, reason: 'refunded' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(verifyLicense('MW-REFUND')).rejects.toThrow(LicenseRefundedError);

    const status = await getLicenseStatus();
    expect(status.tier).toBe('free');
    expect(status.license_revoked_reason).toBe('refunded');
    expect(status.license_revoked_at).not.toBeNull();
    expect(status.license_key).toBe('MW-REFUND');
  });

  it('returns refunded from periodic recheck without double revoke', async () => {
    await setLicenseStatus({ tier: 'premium', license_key: 'MW-REFUND' });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valid: false, reason: 'refunded' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(await runPeriodicLicenseRecheck()).toBe('refunded');

    const status = await getLicenseStatus();
    expect(status.tier).toBe('free');
    expect(status.license_revoked_reason).toBe('refunded');
  });

  it('resolves refund banner message', async () => {
    const now = Date.now();
    const message = resolveLicenseRevokedBanner({
      tier: 'free',
      license_key: 'MW-REFUND',
      trial_start: null,
      trial_end: null,
      last_verified_at: null,
      verify_failure_count: 1,
      license_revoked_at: now,
      license_revoked_reason: 'refunded',
    });

    expect(message).toBe(LICENSE_REFUNDED_BANNER_MESSAGE);
    expect(message).not.toBe(LICENSE_INVALID_BANNER_MESSAGE);
  });
});
