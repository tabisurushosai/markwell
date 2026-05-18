import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Highlight } from '../src/shared/types/highlight.js';
import { createHighlight } from '../src/shared/storage/highlights.js';
import { createTag, getTag, listTags } from '../src/shared/storage/tags.js';
import {
  bulkDeleteTags,
  bulkUpdateTagColors,
} from '../src/options/utils/bulk-tag-operations.js';

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

describe('bulk tag operations', () => {
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

  it('bulkDeleteTags removes selected tags', async () => {
    const tagA = await createTag('Alpha', '#ffd34e');
    const tagB = await createTag('Beta', '#00aa88');
    await createHighlight(sampleHighlightInput([tagA.id]));

    const count = await bulkDeleteTags([tagA.id, tagB.id]);
    expect(count).toBe(2);
    expect(await listTags()).toHaveLength(0);
    expect(await getTag(tagA.id)).toBeNull();
  });

  it('bulkUpdateTagColors updates all selected tags', async () => {
    const tagA = await createTag('Alpha', '#ffd34e');
    const tagB = await createTag('Beta', '#00aa88');

    const count = await bulkUpdateTagColors([tagA.id, tagB.id], '#336699');
    expect(count).toBe(2);
    expect((await getTag(tagA.id))?.color).toBe('#336699');
    expect((await getTag(tagB.id))?.color).toBe('#336699');
  });
});
