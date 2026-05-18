import { openOnboardingIfNeeded } from '../shared/onboarding/open-onboarding.js';

export async function handleExtensionInstalled(reason: chrome.runtime.InstalledReason): Promise<void> {
  if (reason !== 'install') {
    return;
  }
  await openOnboardingIfNeeded();
}
