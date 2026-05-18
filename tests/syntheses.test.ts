import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSynthesis,
  deleteSynthesis,
  getSynthesis,
  listSyntheses,
  updateSynthesis,
} from '../src/shared/storage/syntheses.js';

function createFakeChromeStorage() {
  const store = new Map<string, unknown>();

  return {
    get: vi.fn((keys: string | string[] | Record<string, unknown> | null) => {
      if (keys === null) {
        return Promise.resolve(Object.fromEntries(store));
      }
      if (typeof keys === 'string') {
        return Promise.resolve(store.has(keys) ? { [keys]: store.get(keys) } : {});
      }
      if (Array.isArray(keys)) {
        return Promise.resolve(
          Object.fromEntries(keys.filter((k) => store.has(k)).map((k) => [k, store.get(k)])),
        );
      }
      return Promise.resolve({});
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
      }
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) {
        store.delete(key);
      }
      return Promise.resolve();
    }),
    clear: (): void => {
      store.clear();
    },
  };
}

describe('synthesis CRUD', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: createFakeChromeStorage(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and lists by project_id', async () => {
    const created = await createSynthesis({
      project_id: 'proj-1',
      prompt: 'prompt text',
      result_markdown: '# Result',
      model: 'gemini-2.0-flash',
      token_input: 100,
      token_output: 200,
    });

    expect(created.id).toBeTruthy();
    expect(created.created_at).toBeGreaterThan(0);

    const listed = await listSyntheses({ project_id: 'proj-1' });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
    expect(await getSynthesis(created.id)).toEqual(created);
  });

  it('updates and deletes synthesis', async () => {
    const created = await createSynthesis({
      project_id: 'proj-a',
      prompt: 'a',
      result_markdown: 'b',
      model: 'gemini-2.0-flash',
      token_input: 1,
      token_output: 2,
    });

    const updated = await updateSynthesis(created.id, { result_markdown: 'updated' });
    expect(updated.result_markdown).toBe('updated');

    await deleteSynthesis(created.id);
    expect(await getSynthesis(created.id)).toBeNull();
    expect(await listSyntheses({ project_id: 'proj-a' })).toHaveLength(0);
  });
});
