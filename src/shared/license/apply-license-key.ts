import { setLicenseStatus } from '../storage/license.js';
import type { LicenseStatus } from '../types/license.js';

export async function applyLicenseKey(rawKey: string): Promise<LicenseStatus> {
  const license_key = rawKey.trim();
  if (license_key === '') {
    throw new Error('ライセンスキーを入力してください');
  }

  return setLicenseStatus({ license_key });
}
