import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getLastProjectId, setLastProjectId } from '../src/shared/storage/ui-state.js';

function createFakeChromeStorage() {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn((keys: string | string[] | Record<string, unknown> | null) => {
      if (typeof keys === 'string') {
        return Promise.resolve(store.has(keys) ? { [keys]: store.get(keys) } : {});
      }
      return Promise.resolve({});
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
      }
      return Promise.resolve();
    }),
    clear: (): void => {
      store.clear();
    },
    dump: store,
  };
}

describe('ui-state', () => {
  let fakeStorage: ReturnType<typeof createFakeChromeStorage>;

  beforeEach(() => {
    fakeStorage = createFakeChromeStorage();
    vi.stubGlobal('chrome', {
      storage: {
        local: fakeStorage,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and restores last project id', async () => {
    expect(await getLastProjectId()).toBeNull();
    await setLastProjectId('project-abc');
    expect(await getLastProjectId()).toBe('project-abc');
    expect(fakeStorage.dump.get('markwell:ui:last_project_id')).toBe('project-abc');
  });
});
