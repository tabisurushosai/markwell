import { getLicenseStatus, setLicenseStatus } from '../storage/license.js';
import { LICENSE_VERIFY_URL } from './config.js';
import { getOrCreateDeviceId } from './device-id.js';
import { isWithinLicenseRecheckGrace } from './recheck-grace.js';

type VerifyResponse = {
  valid: boolean;
  tier?: 'premium';
  expires_at?: number | null;
  reason?: string;
};

export class InvalidLicenseKeyError extends Error {
  constructor() {
    super('無効なキー');
    this.name = 'InvalidLicenseKeyError';
  }
}

export class LicenseRefundedError extends Error {
  constructor() {
    super('このライセンスは返金処理のため無効化されました');
    this.name = 'LicenseRefundedError';
  }
}

export async function verifyLicense(
  licenseKey: string,
): Promise<{ valid: boolean; tier: 'premium' }> {
  const license_key = licenseKey.trim();
  if (license_key === '') {
    throw new Error('ライセンスキーを入力してください');
  }

  const device_id = await getOrCreateDeviceId();
  const current = await getLicenseStatus();

  let response: Response;
  try {
    response = await fetch(LICENSE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key, device_id }),
    });
  } catch {
    const inGrace = current.tier === 'premium' && isWithinLicenseRecheckGrace(current);
    if (!inGrace) {
      await setLicenseStatus({
        verify_failure_count: current.verify_failure_count + 1,
      });
    }
    throw new Error('ライセンスキーの検証に失敗しました');
  }

  if (response.status >= 400 && response.status < 500) {
    await setLicenseStatus({
      verify_failure_count: current.verify_failure_count + 1,
    });
    throw new InvalidLicenseKeyError();
  }

  if (!response.ok) {
    const inGrace = current.tier === 'premium' && isWithinLicenseRecheckGrace(current);
    if (!inGrace) {
      await setLicenseStatus({
        verify_failure_count: current.verify_failure_count + 1,
      });
    }
    throw new Error('ライセンスキーの検証に失敗しました');
  }

  const payload = (await response.json()) as VerifyResponse;
  if (!payload.valid || payload.tier !== 'premium') {
    if (payload.reason === 'refunded') {
      await setLicenseStatus({
        tier: 'free',
        verify_failure_count: current.verify_failure_count + 1,
        license_revoked_at: Date.now(),
        license_revoked_reason: 'refunded',
      });
      throw new LicenseRefundedError();
    }

    await setLicenseStatus({
      verify_failure_count: current.verify_failure_count + 1,
    });
    throw new InvalidLicenseKeyError();
  }

  await setLicenseStatus({
    tier: 'premium',
    license_key,
    last_verified_at: Date.now(),
    verify_failure_count: 0,
    license_revoked_at: null,
    license_revoked_reason: null,
  });

  return { valid: true, tier: 'premium' };
}
