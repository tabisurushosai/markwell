import { describe, expect, it } from 'vitest';

import {
  DAY_MS,
  formatTrialRemainingLabel,
  getTrialDaysRemaining,
  isTrialUrgent,
} from '../src/shared/license/trial-countdown.js';

describe('trial-countdown', () => {
  const now = 1_700_000_000_000;

  it('counts remaining days with ceil', () => {
    expect(getTrialDaysRemaining(now + 5 * DAY_MS, now)).toBe(5);
    expect(getTrialDaysRemaining(now + 5 * DAY_MS + 1, now)).toBe(6);
    expect(getTrialDaysRemaining(now + DAY_MS - 1, now)).toBe(1);
  });

  it('returns 0 when expired', () => {
    expect(getTrialDaysRemaining(now - 1, now)).toBe(0);
  });

  it('formats remaining label', () => {
    expect(formatTrialRemainingLabel(5)).toBe('5 days left');
  });

  it('flags urgent when one day or less', () => {
    expect(isTrialUrgent(2)).toBe(false);
    expect(isTrialUrgent(1)).toBe(true);
    expect(isTrialUrgent(0)).toBe(true);
  });
});
