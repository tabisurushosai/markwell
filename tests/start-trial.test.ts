import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  hasUsedTrial,
  startTrial,
  TRIAL_DURATION_MS,
  TrialAlreadyUsedError,
} from '../src/shared/license/start-trial.js';
import { getCurrentTier, setLicenseStatus } from '../src/shared/storage/license.js';

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

describe('startTrial', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: createFakeChromeStorage(),
      },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts a 7-day trial when never used', async () => {
    const now = Date.now();
    const status = await startTrial();

    expect(status.tier).toBe('trial');
    expect(status.trial_start).toBe(now);
    expect(status.trial_end).toBe(now + TRIAL_DURATION_MS);
    expect(await getCurrentTier()).toBe('trial');
    expect(await hasUsedTrial()).toBe(true);
  });

  it('rejects second trial attempt', async () => {
    await startTrial();
    await expect(startTrial()).rejects.toThrow(TrialAlreadyUsedError);
    await expect(startTrial()).rejects.toThrow('トライアルは 1 回のみ');
  });

  it('hasUsedTrial is true after expired trial', async () => {
    await setLicenseStatus({
      tier: 'trial',
      trial_start: Date.now() - 14 * 24 * 60 * 60 * 1000,
      trial_end: Date.now() - 1000,
    });

    expect(await hasUsedTrial()).toBe(true);
    await expect(startTrial()).rejects.toThrow(TrialAlreadyUsedError);
  });
});
