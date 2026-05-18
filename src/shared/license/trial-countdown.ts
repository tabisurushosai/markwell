import { t } from '../utils/i18n.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days remaining until `trialEnd` (ceil). Returns 0 when already expired. */
export function getTrialDaysRemaining(trialEnd: number, now = Date.now()): number {
  if (trialEnd <= now) {
    return 0;
  }
  return Math.ceil((trialEnd - now) / DAY_MS);
}

export function formatTrialRemainingLabel(days: number): string {
  return t('tier_trial_remaining', String(days));
}

/** True when one day or less remains (red emphasis in UI). */
export function isTrialUrgent(daysRemaining: number): boolean {
  return daysRemaining <= 1;
}
