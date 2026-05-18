import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Highlight } from '../src/shared/types/highlight.js';
import {
  assertHighlightLimit,
  countHighlights,
  createHighlight,
  deleteHighlight,
  getHighlight,
  listHighlights,
  TierLimitError,
  updateHighlight,
} from '../src/shared/storage/highlights.js';

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

function sampleHighlightInput(): Omit<Highlight, 'id' | 'created_at' | 'updated_at'> {
  return {
    url: 'https://example.com/page?q=1#section',
    url_canonical: 'https://example.com/page',
    page_title: 'Example',
    selected_text: 'hello world',
    context_before: 'before ',
    context_after: ' after',
    anchor: {
      type: 'rangy',
      serialized: 'serialized-range',
      fallback: { text: 'hello world', occurrence: 0 },
    },
    color: 'yellow',
    note: '',
    tag_ids: ['tag-a'],
    project_id: 'project-1',
    ai_tags: [],
    domain: 'example.com',
    favicon_data_url: '',
  };
}

describe('highlight CRUD', () => {
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

  it('create → get → update → list → delete → count', async () => {
    const created = await createHighlight(sampleHighlightInput());
    expect(created.id).toBeTruthy();

    const loaded = await getHighlight(created.id);
    expect(loaded).toEqual(created);

    const updated = await updateHighlight(created.id, {
      note: 'updated note',
      tag_ids: ['tag-a', 'tag-b'],
    });
    expect(updated.note).toBe('updated note');
    expect(updated.tag_ids).toEqual(['tag-a', 'tag-b']);
    expect(updated.updated_at).toBeGreaterThanOrEqual(created.updated_at);

    const byUrl = await listHighlights({ url_canonical: created.url_canonical });
    expect(byUrl.map((h) => h.id)).toContain(created.id);

    const byTag = await listHighlights({ tag_id: 'tag-b' });
    expect(byTag.map((h) => h.id)).toContain(created.id);

    const byProject = await listHighlights({ project_id: 'project-1' });
    expect(byProject.map((h) => h.id)).toContain(created.id);

    expect(await countHighlights()).toBe(1);

    await deleteHighlight(created.id);
    expect(await getHighlight(created.id)).toBeNull();
    expect(await countHighlights()).toBe(0);
    expect(await listHighlights({ url_canonical: created.url_canonical })).toEqual([]);
  });

  it('assertHighlightLimit throws TierLimitError at free tier cap', async () => {
    for (let i = 0; i < 50; i += 1) {
      await createHighlight(sampleHighlightInput());
    }

    await expect(assertHighlightLimit('free')).rejects.toBeInstanceOf(TierLimitError);
  });
});
