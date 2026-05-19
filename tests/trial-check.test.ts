import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  isTrialExpired,
  runTrialExpiryCheck,
  TRIAL_EXPIRED_NOTIFICATION_ID,
  TRIAL_EXPIRED_NOTIFICATION_MESSAGE,
  TRIAL_EXPIRY_NOTIFIED_KEY,
} from '../src/background/trial-check.js';
import { setLicenseStatus } from '../src/shared/storage/license.js';
import { kvGet, kvSet } from '../src/shared/storage/kv.js';

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

describe('trial-check', () => {
  let fakeStorage: ReturnType<typeof createFakeChromeStorage>;
  const notificationsCreate = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    fakeStorage = createFakeChromeStorage();
    notificationsCreate.mockClear();
    vi.stubGlobal('chrome', {
      storage: { local: fakeStorage },
      notifications: { create: notificationsCreate },
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects expired trial from stored status', () => {
    const end = Date.now() - 1000;
    expect(
      isTrialExpired({
        tier: 'trial',
        license_key: null,
        trial_start: end - 7 * 24 * 60 * 60 * 1000,
        trial_end: end,
        last_verified_at: null,
        verify_failure_count: 0,
        license_revoked_at: null,
        license_revoked_reason: null,
      }),
    ).toBe(true);
  });

  it('sends notification once per trial_end', async () => {
    const trialEnd = Date.now() - 1000;
    await setLicenseStatus({
      tier: 'trial',
      trial_start: trialEnd - 7 * 24 * 60 * 60 * 1000,
      trial_end: trialEnd,
    });

    const first = await runTrialExpiryCheck();
    const second = await runTrialExpiryCheck();

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(notificationsCreate).toHaveBeenCalledTimes(1);
    expect(notificationsCreate).toHaveBeenCalledWith(TRIAL_EXPIRED_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: 'chrome-extension://test/icons/icon-128.png',
      title: 'Markwell',
      message: TRIAL_EXPIRED_NOTIFICATION_MESSAGE,
    });
    expect(await kvGet(TRIAL_EXPIRY_NOTIFIED_KEY, z.number())).toBe(trialEnd);
  });

  it('does not notify while trial is active', async () => {
    await setLicenseStatus({
      tier: 'trial',
      trial_end: Date.now() + 3 * 24 * 60 * 60 * 1000,
    });

    expect(await runTrialExpiryCheck()).toBe(false);
    expect(notificationsCreate).not.toHaveBeenCalled();
  });

  it('does not notify again after marker is set for same trial_end', async () => {
    const trialEnd = Date.now() - 500;
    await setLicenseStatus({ tier: 'trial', trial_end: trialEnd });
    await kvSet(TRIAL_EXPIRY_NOTIFIED_KEY, trialEnd, z.number());

    expect(await runTrialExpiryCheck()).toBe(false);
    expect(notificationsCreate).not.toHaveBeenCalled();
  });
});
