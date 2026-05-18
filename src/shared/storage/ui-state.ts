const LAST_PROJECT_ID_KEY = 'markwell:ui:last_project_id';

export async function getLastProjectId(): Promise<string | null> {
  const stored = await chrome.storage.local.get(LAST_PROJECT_ID_KEY);
  const value = stored[LAST_PROJECT_ID_KEY];
  if (typeof value !== 'string' || value === '') {
    return null;
  }
  return value;
}

export async function setLastProjectId(projectId: string): Promise<void> {
  await chrome.storage.local.set({ [LAST_PROJECT_ID_KEY]: projectId });
}
