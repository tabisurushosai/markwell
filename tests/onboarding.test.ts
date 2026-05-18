import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleExtensionInstalled } from '../src/background/onboarding.js';
import { ONBOARDING_PAGE_PATH } from '../src/shared/onboarding/constants.js';
import {
  getOnboardingPageUrl,
  openOnboardingIfNeeded,
  shouldOpenOnboardingOnInstall,
} from '../src/shared/onboarding/open-onboarding.js';
import { getSettings, setSettings } from '../src/shared/storage/settings.js';

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

describe('onboarding flow', () => {
  const tabsCreate = vi.fn().mockResolvedValue({ id: 1 });
  let fakeStorage: ReturnType<typeof createFakeChromeStorage>;

  beforeEach(() => {
    fakeStorage = createFakeChromeStorage();
    tabsCreate.mockClear();
    vi.stubGlobal('chrome', {
      storage: { local: fakeStorage },
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      },
      tabs: { create: tabsCreate },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens onboarding when onboarding_seen is false', async () => {
    expect(await shouldOpenOnboardingOnInstall()).toBe(true);

    const opened = await openOnboardingIfNeeded();
    expect(opened).toBe(true);
    expect(tabsCreate).toHaveBeenCalledWith({
      url: getOnboardingPageUrl(),
    });
    expect(getOnboardingPageUrl()).toContain(ONBOARDING_PAGE_PATH);
  });

  it('skips opening when onboarding_seen is true', async () => {
    await setSettings({ onboarding_seen: true });

    expect(await shouldOpenOnboardingOnInstall()).toBe(false);
    expect(await openOnboardingIfNeeded()).toBe(false);
    expect(tabsCreate).not.toHaveBeenCalled();
  });

  it('opens only on install reason', async () => {
    await handleExtensionInstalled('install');
    expect(tabsCreate).toHaveBeenCalledTimes(1);

    tabsCreate.mockClear();
    await handleExtensionInstalled('update');
    expect(tabsCreate).not.toHaveBeenCalled();

    await handleExtensionInstalled('chrome_update');
    expect(tabsCreate).not.toHaveBeenCalled();
  });
});
