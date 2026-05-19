import { openOnboardingIfNeeded } from '../shared/onboarding/open-onboarding.js';

export async function handleExtensionInstalled(
  reason: chrome.runtime.InstalledDetails['reason'],
): Promise<void> {
  if (reason !== 'install') {
    return;
  }
  await openOnboardingIfNeeded();
}
