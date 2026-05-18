import { LicenseStatusSchema, type LicenseStatus } from '../types/license.js';
import { kvGet, kvSet } from './kv.js';

const LICENSE_KEY = 'markwell:license';

const DEFAULT_LICENSE_STATUS: LicenseStatus = {
  tier: 'free',
  license_key: null,
  trial_start: null,
  trial_end: null,
  last_verified_at: null,
  verify_failure_count: 0,
  license_revoked_at: null,
  license_revoked_reason: null,
};

function mergeLicenseStatus(base: LicenseStatus, patch: Partial<LicenseStatus>): LicenseStatus {
  return {
    ...base,
    ...patch,
  };
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
  const stored = await kvGet(LICENSE_KEY, LicenseStatusSchema);
  if (stored === null) {
    return { ...DEFAULT_LICENSE_STATUS };
  }
  return mergeLicenseStatus(DEFAULT_LICENSE_STATUS, stored);
}

export async function setLicenseStatus(patch: Partial<LicenseStatus>): Promise<LicenseStatus> {
  const current = await getLicenseStatus();
  const next = mergeLicenseStatus(current, patch);
  await kvSet(LICENSE_KEY, next, LicenseStatusSchema);
  return next;
}

export async function getCurrentTier(): Promise<'free' | 'trial' | 'premium'> {
  const status = await getLicenseStatus();

  if (status.tier === 'trial' && status.trial_end !== null && status.trial_end < Date.now()) {
    return 'free';
  }

  return status.tier;
}
