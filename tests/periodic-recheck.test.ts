import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_ID_STORAGE_KEY } from '../src/shared/license/device-id.js';
import { LICENSE_VERIFY_URL } from '../src/shared/license/config.js';
import {
  runPeriodicLicenseRecheck,
  shouldRunLicenseRecheck,
} from '../src/shared/license/periodic-recheck.js';
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

describe('periodic license recheck', () => {
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

  it('skips non-premium tiers', async () => {
    await setLicenseStatus({ tier: 'free' });
    expect(shouldRunLicenseRecheck(await getLicenseStatus())).toBe(false);
    expect(await runPeriodicLicenseRecheck()).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips premium without stored key', async () => {
    await setLicenseStatus({ tier: 'premium', license_key: null });
    expect(await runPeriodicLicenseRecheck()).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies premium license on success', async () => {
    await setLicenseStatus({ tier: 'premium', license_key: 'MW-OK' });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valid: true, tier: 'premium' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(await runPeriodicLicenseRecheck()).toBe('verified');
    expect(fetchMock).toHaveBeenCalledWith(
      LICENSE_VERIFY_URL,
      expect.objectContaining({
        body: JSON.stringify({ license_key: 'MW-OK', device_id: 'DEVICE123' }),
      }),
    );
  });

  it('keeps premium tier on network failure and increments verify_failure_count', async () => {
    await setLicenseStatus({ tier: 'premium', license_key: 'MW-OK', verify_failure_count: 1 });
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await runPeriodicLicenseRecheck()).toBe('network_failure');

    const status = await getLicenseStatus();
    expect(status.tier).toBe('premium');
    expect(status.verify_failure_count).toBe(2);
    expect(status.license_revoked_at).toBeNull();
  });

  it('revokes premium on 4xx invalid license', async () => {
    await setLicenseStatus({ tier: 'premium', license_key: 'MW-BAD' });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valid: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(await runPeriodicLicenseRecheck()).toBe('revoked');

    const status = await getLicenseStatus();
    expect(status.tier).toBe('free');
    expect(status.license_revoked_at).not.toBeNull();
    expect(status.license_key).toBe('MW-BAD');
  });
});
