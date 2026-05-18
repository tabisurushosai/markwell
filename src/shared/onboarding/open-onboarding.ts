import { getSettings } from '../storage/settings.js';
import { ONBOARDING_PAGE_PATH } from './constants.js';

export function getOnboardingPageUrl(): string {
  return chrome.runtime.getURL(ONBOARDING_PAGE_PATH);
}

export async function shouldOpenOnboardingOnInstall(): Promise<boolean> {
  const settings = await getSettings();
  return !settings.onboarding_seen;
}

export async function openOnboardingTab(): Promise<void> {
  await chrome.tabs.create({ url: getOnboardingPageUrl() });
}

export async function openOnboardingIfNeeded(): Promise<boolean> {
  if (!(await shouldOpenOnboardingOnInstall())) {
    return false;
  }
  await openOnboardingTab();
  return true;
}
