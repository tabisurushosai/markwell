import { getLicenseStatus, setLicenseStatus } from '../storage/license.js';
import type { LicenseStatus } from '../types/license.js';
import { verifyLicenseKey } from './verify-license-key.js';

export async function applyLicenseKey(rawKey: string): Promise<LicenseStatus> {
  const license_key = rawKey.trim();
  if (license_key === '') {
    throw new Error('ライセンスキーを入力してください');
  }

  await setLicenseStatus({ license_key });
  return verifyLicenseKey();
}

export async function getStoredLicenseKey(): Promise<string | null> {
  const status = await getLicenseStatus();
  return status.license_key;
}
