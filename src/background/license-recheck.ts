import { runPeriodicLicenseRecheck } from '../shared/license/periodic-recheck.js';

export const LICENSE_RECHECK_ALARM_NAME = 'markwell_license_recheck';

/** 7 days — chrome.alarms minimum period in MV3 */
export const LICENSE_RECHECK_PERIOD_MINUTES = 60 * 24 * 7;

export async function ensureLicenseRecheckAlarm(): Promise<void> {
  const existing = await chrome.alarms.get(LICENSE_RECHECK_ALARM_NAME);
  if (existing !== undefined) {
    return;
  }
  await chrome.alarms.create(LICENSE_RECHECK_ALARM_NAME, {
    periodInMinutes: LICENSE_RECHECK_PERIOD_MINUTES,
  });
}

let licenseRecheckInitialized = false;

export function initLicenseRecheck(): void {
  if (licenseRecheckInitialized) {
    return;
  }
  licenseRecheckInitialized = true;

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === LICENSE_RECHECK_ALARM_NAME) {
      void runPeriodicLicenseRecheck();
    }
  });

  void ensureLicenseRecheckAlarm();
}
