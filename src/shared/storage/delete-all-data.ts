import { getLicenseStatus, setLicenseStatus } from './license.js';

/** ライセンス情報を保持したまま chrome.storage.local をすべて削除する */
export async function deleteAllData(): Promise<void> {
  const licenseBackup = await getLicenseStatus();
  await chrome.storage.local.clear();
  await setLicenseStatus(licenseBackup);
}
