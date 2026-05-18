import { getLicenseStatus } from '../storage/license.js';
import type { LicenseStatus } from '../types/license.js';
import { verifyLicense } from './verify.js';

export async function applyLicenseKey(rawKey: string): Promise<LicenseStatus> {
  const license_key = rawKey.trim();
  if (license_key === '') {
    throw new Error('ライセンスキーを入力してください');
  }

  await verifyLicense(license_key);
  return getLicenseStatus();
}

export async function getStoredLicenseKey(): Promise<string | null> {
  const status = await getLicenseStatus();
  return status.license_key;
}
