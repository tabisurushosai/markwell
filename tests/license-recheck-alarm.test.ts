import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensureLicenseRecheckAlarm,
  LICENSE_RECHECK_ALARM_NAME,
  LICENSE_RECHECK_PERIOD_MINUTES,
} from '../src/background/license-recheck.js';

describe('license recheck alarm', () => {
  const alarmsGet = vi.fn();
  const alarmsCreate = vi.fn();

  beforeEach(() => {
    alarmsGet.mockReset();
    alarmsCreate.mockReset();
    vi.stubGlobal('chrome', {
      alarms: {
        get: alarmsGet,
        create: alarmsCreate,
        onAlarm: { addListener: vi.fn() },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates 7-day periodic alarm when missing', async () => {
    alarmsGet.mockResolvedValue(undefined);
    alarmsCreate.mockResolvedValue(undefined);

    await ensureLicenseRecheckAlarm();

    expect(alarmsCreate).toHaveBeenCalledWith(LICENSE_RECHECK_ALARM_NAME, {
      periodInMinutes: LICENSE_RECHECK_PERIOD_MINUTES,
    });
    expect(LICENSE_RECHECK_PERIOD_MINUTES).toBe(60 * 24 * 7);
  });

  it('does not recreate existing alarm', async () => {
    alarmsGet.mockResolvedValue({ name: LICENSE_RECHECK_ALARM_NAME });

    await ensureLicenseRecheckAlarm();

    expect(alarmsCreate).not.toHaveBeenCalled();
  });
});
