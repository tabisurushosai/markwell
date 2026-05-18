import { getLicenseStatus, setLicenseStatus } from '../storage/license.js';
import type { LicenseStatus } from '../types/license.js';

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export class TrialAlreadyUsedError extends Error {
  constructor() {
    super('トライアルは 1 回のみ');
    this.name = 'TrialAlreadyUsedError';
  }
}

export async function hasUsedTrial(): Promise<boolean> {
  const status = await getLicenseStatus();
  return status.trial_start !== null;
}

export async function startTrial(): Promise<LicenseStatus> {
  const status = await getLicenseStatus();
  if (status.trial_start !== null) {
    throw new TrialAlreadyUsedError();
  }

  const now = Date.now();
  return setLicenseStatus({
    tier: 'trial',
    trial_start: now,
    trial_end: now + TRIAL_DURATION_MS,
  });
}
