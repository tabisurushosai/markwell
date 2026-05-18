import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEVICE_ID_STORAGE_KEY } from '../src/shared/license/device-id.js';
import { LICENSE_VERIFY_URL } from '../src/shared/license/config.js';
import { InvalidLicenseKeyError, verifyLicense } from '../src/shared/license/verify.js';
import { getLicenseStatus } from '../src/shared/storage/license.js';

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
    remove: vi.fn((keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) {
        store.delete(key);
      }
      return Promise.resolve();
    }),
    dump: store,
  };
}

describe('verifyLicense', () => {
  const fetchMock = vi.fn();
  let fakeStorage: ReturnType<typeof createFakeChromeStorage>;

  beforeEach(() => {
    fakeStorage = createFakeChromeStorage();
    fakeStorage.dump.set(DEVICE_ID_STORAGE_KEY, 'DEVICE123');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('chrome', {
      storage: {
        local: fakeStorage,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts license_key and device_id to LICENSE_VERIFY_URL', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valid: true, tier: 'premium', expires_at: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await verifyLicense('MW-TEST-KEY');

    expect(result).toEqual({ valid: true, tier: 'premium' });
    expect(fetchMock).toHaveBeenCalledWith(LICENSE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: 'MW-TEST-KEY', device_id: 'DEVICE123' }),
    });

    const status = await getLicenseStatus();
    expect(status.tier).toBe('premium');
    expect(status.license_key).toBe('MW-TEST-KEY');
    expect(status.last_verified_at).not.toBeNull();
    expect(status.verify_failure_count).toBe(0);
  });

  it('throws InvalidLicenseKeyError on 4xx', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valid: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(verifyLicense('MW-BAD-KEY')).rejects.toThrow(InvalidLicenseKeyError);
    await expect(verifyLicense('MW-BAD-KEY-2')).rejects.toThrow('無効なキー');
  });

  it('throws InvalidLicenseKeyError when valid is false on 200', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(verifyLicense('MW-BAD-KEY')).rejects.toThrow('無効なキー');
  });
});
