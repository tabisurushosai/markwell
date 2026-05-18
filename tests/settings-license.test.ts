import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentTier, getLicenseStatus, setLicenseStatus } from '../src/shared/storage/license.js';
import {
  getApiKey,
  getSettings,
  setApiKey,
  setSettings,
} from '../src/shared/storage/settings.js';

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
    clear: (): void => {
      store.clear();
    },
    dump: store,
  };
}

describe('settings + license storage', () => {
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

  it('returns default settings when unset', async () => {
    const settings = await getSettings();
    expect(settings.default_color).toBe('yellow');
    expect(settings.ai.model).toBe('gemini-2.0-flash');
    expect(settings.shortcuts.quick_highlight).toBe('Alt+H');
    expect(settings.onboarding_seen).toBe(false);
    expect(settings.theme).toBe('dark');
  });

  it('encrypts and decrypts API key without storing plaintext', async () => {
    const secret = 'gemini-secret-key-12345';
    await setApiKey(secret);

    const settingsRaw = fakeStorage.dump.get('markwell:settings') as {
      ai: { api_key_encrypted: string };
    };
    expect(settingsRaw.ai.api_key_encrypted).not.toContain(secret);

    expect(await getApiKey()).toBe(secret);

    await setApiKey('rotated-key');
    expect(await getApiKey()).toBe('rotated-key');
  });

  it('merges settings patch', async () => {
    const updated = await setSettings({ density: 'compact', onboarding_seen: true });
    expect(updated.density).toBe('compact');
    expect(updated.onboarding_seen).toBe(true);
    expect(updated.default_color).toBe('yellow');
  });

  it('downgrades expired trial tier in getCurrentTier', async () => {
    await setLicenseStatus({
      tier: 'trial',
      trial_start: Date.now() - 14 * 24 * 60 * 60 * 1000,
      trial_end: Date.now() - 1000,
    });

    expect((await getLicenseStatus()).tier).toBe('trial');
    expect(await getCurrentTier()).toBe('free');
  });

  it('keeps active trial tier', async () => {
    await setLicenseStatus({
      tier: 'trial',
      trial_end: Date.now() + 24 * 60 * 60 * 1000,
    });

    expect(await getCurrentTier()).toBe('trial');
  });
});
