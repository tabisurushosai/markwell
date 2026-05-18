import type { LicenseRevokedReason, LicenseStatus } from '../types/license.js';

export const LICENSE_REFUNDED_BANNER_MESSAGE =
  'このライセンスは返金処理のため無効化されました。保存済みのハイライトはそのまま残ります。Premium セクションで新しいライセンスキーを適用してください。';

export const LICENSE_INVALID_BANNER_MESSAGE =
  'ライセンスが失効しました。Premium セクションでライセンスキーを再入力するか、新しいキーを購入してください。';

export function resolveLicenseRevokedBanner(status: LicenseStatus): string | null {
  if (status.license_revoked_at === null) {
    return null;
  }
  if (status.license_revoked_reason === 'refunded') {
    return LICENSE_REFUNDED_BANNER_MESSAGE;
  }
  return LICENSE_INVALID_BANNER_MESSAGE;
}

export function isRefundedLicenseStatus(status: LicenseStatus): boolean {
  return status.license_revoked_reason === 'refunded';
}

export type { LicenseRevokedReason };
