import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Highlight } from '../src/shared/types/highlight.js';
import { createHighlight, getHighlight } from '../src/shared/storage/highlights.js';
import {
  createTag,
  deleteTag,
  getTag,
  listTags,
  mergeTag,
  renameTag,
} from '../src/shared/storage/tags.js';

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

function sampleHighlightInput(tagIds: string[]): Omit<Highlight, 'id' | 'created_at' | 'updated_at'> {
  return {
    url: 'https://example.com/page',
    url_canonical: 'https://example.com/page',
    page_title: 'Example',
    selected_text: 'hello',
    context_before: '',
    context_after: '',
    anchor: {
      type: 'rangy',
      serialized: 'range',
      fallback: { text: 'hello', occurrence: 0 },
    },
    color: 'yellow',
    note: '',
    tag_ids: tagIds,
    project_id: null,
    ai_tags: [],
    translation_cache: {},
    domain: 'example.com',
    favicon_data_url: '',
  };
}

describe('tag CRUD', () => {
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

  it('create → get → list → rename → merge → delete', async () => {
    const tagA = await createTag('Research', '#ffd34e');
    const tagADupe = await createTag('Research', '#000000');
    expect(tagADupe.id).toBe(tagA.id);

    const tagB = await createTag('Writing', '#00aa88');
    expect(await listTags()).toHaveLength(2);
    expect(await getTag(tagB.id)).toEqual(tagB);

    const renamed = await renameTag(tagB.id, 'Draft');
    expect(renamed.name).toBe('Draft');

    const highlight = await createHighlight(sampleHighlightInput([tagA.id, tagB.id]));
    await mergeTag(tagB.id, tagA.id);

    expect(await getTag(tagB.id)).toBeNull();

    const updatedHighlight = await getHighlight(highlight.id);
    expect(updatedHighlight?.tag_ids).toEqual([tagA.id]);

    await deleteTag(tagA.id);
    expect(await getTag(tagA.id)).toBeNull();
    expect((await getHighlight(highlight.id))?.tag_ids).toEqual([]);
  });

  it('rejects invalid tag color on create', async () => {
    await expect(createTag('Bad Color', 'yellow')).rejects.toThrow();
  });
});
