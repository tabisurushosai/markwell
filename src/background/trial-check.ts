import { z } from 'zod';

import type { LicenseStatus } from '../shared/types/license.js';
import { getLicenseStatus } from '../shared/storage/license.js';
import { kvGet, kvSet } from '../shared/storage/kv.js';

export const TRIAL_CHECK_ALARM_NAME = 'markwell_trial_check';
export const TRIAL_EXPIRY_NOTIFIED_KEY = 'markwell:trial_expiry_notified_end';
export const TRIAL_EXPIRED_NOTIFICATION_ID = 'markwell_trial_expired';
export const TRIAL_EXPIRED_NOTIFICATION_MESSAGE =
  'トライアル終了、Premium で続けるなら $5';

const TRIAL_CHECK_PERIOD_MINUTES = 24 * 60;

export function isTrialExpired(status: LicenseStatus, now = Date.now()): boolean {
  return status.tier === 'trial' && status.trial_end !== null && status.trial_end < now;
}

export async function runTrialExpiryCheck(now = Date.now()): Promise<boolean> {
  const status = await getLicenseStatus();
  if (!isTrialExpired(status, now) || status.trial_end === null) {
    return false;
  }

  const notifiedEnd = await kvGet(TRIAL_EXPIRY_NOTIFIED_KEY, z.number());
  if (notifiedEnd === status.trial_end) {
    return false;
  }

  await chrome.notifications.create(TRIAL_EXPIRED_NOTIFICATION_ID, {
    type: 'basic',
    title: 'Markwell',
    message: TRIAL_EXPIRED_NOTIFICATION_MESSAGE,
  });

  await kvSet(TRIAL_EXPIRY_NOTIFIED_KEY, status.trial_end, z.number());
  return true;
}

export async function ensureTrialCheckAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(TRIAL_CHECK_ALARM_NAME);
  if (existing !== undefined) {
    return;
  }
  await chrome.alarms.create(TRIAL_CHECK_ALARM_NAME, {
    periodInMinutes: TRIAL_CHECK_PERIOD_MINUTES,
  });
}

let trialCheckInitialized = false;

export function initTrialCheck(): void {
  if (trialCheckInitialized) {
    return;
  }
  trialCheckInitialized = true;

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TRIAL_CHECK_ALARM_NAME) {
      void runTrialExpiryCheck();
    }
  });

  void ensureTrialCheckAlarm();
  void runTrialExpiryCheck();
}
