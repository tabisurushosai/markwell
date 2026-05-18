import { LICENSE_VERIFY_URL } from './config.js';
import { getLicenseStatus, setLicenseStatus } from '../storage/license.js';
import type { LicenseStatus } from '../types/license.js';

type VerifyResponse = {
  valid: boolean;
  tier?: 'premium';
};

export async function verifyLicenseKey(): Promise<LicenseStatus> {
  const current = await getLicenseStatus();
  const license_key = current.license_key?.trim() ?? '';
  if (license_key === '') {
    throw new Error('ライセンスキーが設定されていません');
  }

  let response: Response;
  try {
    response = await fetch(LICENSE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key }),
    });
  } catch {
    await setLicenseStatus({
      verify_failure_count: current.verify_failure_count + 1,
    });
    throw new Error('ライセンスキーの検証に失敗しました');
  }

  if (!response.ok) {
    await setLicenseStatus({
      verify_failure_count: current.verify_failure_count + 1,
    });
    throw new Error('ライセンスキーが無効です');
  }

  const payload = (await response.json()) as VerifyResponse;
  if (payload.valid !== true) {
    await setLicenseStatus({
      verify_failure_count: current.verify_failure_count + 1,
    });
    throw new Error('ライセンスキーが無効です');
  }

  return setLicenseStatus({
    license_key,
    tier: 'premium',
    last_verified_at: Date.now(),
    verify_failure_count: 0,
  });
}
