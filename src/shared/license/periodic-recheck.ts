import { InvalidLicenseKeyError, verifyLicense } from './verify.js';
import { getLicenseStatus, setLicenseStatus } from '../storage/license.js';

export const LICENSE_RECHECK_GRACE_MS = 24 * 60 * 60 * 1000;

export type LicenseRecheckResult = 'skipped' | 'verified' | 'network_failure' | 'revoked';

export function shouldRunLicenseRecheck(
  status: Awaited<ReturnType<typeof getLicenseStatus>>,
): boolean {
  return (
    status.tier === 'premium' &&
    status.license_key !== null &&
    status.license_key.trim() !== ''
  );
}

export async function revokePremiumForInvalidLicense(now = Date.now()): Promise<void> {
  await setLicenseStatus({
    tier: 'free',
    license_revoked_at: now,
  });
}

export async function runPeriodicLicenseRecheck(): Promise<LicenseRecheckResult> {
  const status = await getLicenseStatus();
  if (!shouldRunLicenseRecheck(status)) {
    return 'skipped';
  }

  try {
    await verifyLicense(status.license_key!);
    return 'verified';
  } catch (error) {
    if (error instanceof InvalidLicenseKeyError) {
      await revokePremiumForInvalidLicense();
      return 'revoked';
    }
    return 'network_failure';
  }
}
