export const OPTIONS_SECTION_KEY = 'markwell:options_section';

export type OptionsSectionId = 'premium';

export async function navigateToOptionsPremium(): Promise<void> {
  await chrome.storage.local.set({ [OPTIONS_SECTION_KEY]: 'premium' satisfies OptionsSectionId });
  await chrome.runtime.openOptionsPage();
}

export async function consumeOptionsSectionRequest(): Promise<OptionsSectionId | null> {
  const result = await chrome.storage.local.get(OPTIONS_SECTION_KEY);
  const section = result[OPTIONS_SECTION_KEY];
  if (section === 'premium') {
    await chrome.storage.local.remove(OPTIONS_SECTION_KEY);
    return 'premium';
  }
  return null;
}
