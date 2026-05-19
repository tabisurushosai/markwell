import type { LicenseStatus } from '../types/license.js';

import { LICENSE_RECHECK_GRACE_MS } from './constants.js';

export function isWithinLicenseRecheckGrace(
  status: Pick<LicenseStatus, 'last_verified_at'>,
  now = Date.now(),
): boolean {
  if (status.last_verified_at === null) {
    return false;
  }
  return now - status.last_verified_at < LICENSE_RECHECK_GRACE_MS;
}
