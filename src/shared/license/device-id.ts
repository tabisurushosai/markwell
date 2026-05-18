import { ulid } from 'ulid';

export const DEVICE_ID_STORAGE_KEY = 'markwell:device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  const stored = await chrome.storage.local.get(DEVICE_ID_STORAGE_KEY);
  const existing = stored[DEVICE_ID_STORAGE_KEY];
  if (typeof existing === 'string' && existing.trim() !== '') {
    return existing;
  }

  const device_id = ulid();
  await chrome.storage.local.set({ [DEVICE_ID_STORAGE_KEY]: device_id });
  return device_id;
}
