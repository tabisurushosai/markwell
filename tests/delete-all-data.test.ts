import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteAllData } from '../src/shared/storage/delete-all-data.js';
import { getLicenseStatus, setLicenseStatus } from '../src/shared/storage/license.js';
import { setApiKey, getApiKey, getSettings } from '../src/shared/storage/settings.js';
import { createTag } from '../src/shared/storage/tags.js';

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
    clear: vi.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
    dump: store,
  };
}

describe('deleteAllData', () => {
  let fakeStorage: ReturnType<typeof createFakeChromeStorage>;

  beforeEach(() => {
    fakeStorage = createFakeChromeStorage();
    vi.stubGlobal('chrome', {
      storage: {
        local: fakeStorage,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears storage but restores license status', async () => {
    await setLicenseStatus({
      tier: 'premium',
      license_key: 'MW-PREMIUM-KEY',
    });
    await setApiKey('gemini-secret');
    await createTag('Read', '#aabbcc');

    await deleteAllData();

    expect(fakeStorage.clear).toHaveBeenCalled();
    expect(await getLicenseStatus()).toMatchObject({
      tier: 'premium',
      license_key: 'MW-PREMIUM-KEY',
    });
    expect(await getApiKey()).toBeNull();
    expect((await getSettings()).default_color).toBe('yellow');
    expect(fakeStorage.dump.size).toBe(1);
    expect(fakeStorage.dump.has('markwell:license')).toBe(true);
  });
});
