import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyLicenseKey } from '../src/shared/license/apply-license-key.js';
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
  };
}

describe('applyLicenseKey', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: createFakeChromeStorage(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores trimmed license key', async () => {
    const status = await applyLicenseKey('  MW-TEST-KEY  ');
    expect(status.license_key).toBe('MW-TEST-KEY');
    expect((await getLicenseStatus()).license_key).toBe('MW-TEST-KEY');
  });

  it('rejects empty license key', async () => {
    await expect(applyLicenseKey('   ')).rejects.toThrow('ライセンスキーを入力してください');
  });
});
