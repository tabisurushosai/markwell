import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Highlight } from '../src/shared/types/highlight.js';
import { createHighlight, getHighlight } from '../src/shared/storage/highlights.js';
import { createProject, getProject } from '../src/shared/storage/projects.js';
import { createTag } from '../src/shared/storage/tags.js';
import {
  bulkAddHighlightsToProject,
  bulkAddTagsToHighlights,
  bulkDeleteHighlights,
  mergeTagIds,
} from '../src/popup/utils/bulk-highlight-operations.js';

vi.mock('../src/popup/utils/notify-highlight-removed.js', () => ({
  notifyHighlightRemovedOnOpenTabs: vi.fn().mockResolvedValue(undefined),
}));

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
    url: 'https://example.com/article',
    url_canonical: 'https://example.com/article',
    page_title: 'Article',
    selected_text: 'insight',
    context_before: '',
    context_after: '',
    anchor: {
      type: 'rangy',
      serialized: 'range',
      fallback: { text: 'insight', occurrence: 0 },
    },
    color: 'yellow',
    note: '',
    tag_ids: [],
    project_id: null,
    ai_tags: [],
    translation_cache: {},
    domain: 'example.com',
    favicon_data_url: '',
  };
}

describe('bulk highlight operations', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: createFakeChromeStorage(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('mergeTagIds deduplicates tags', () => {
    expect(mergeTagIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('bulkAddHighlightsToProject assigns highlights to project', async () => {
    const project = await createProject('Research');
    const h1 = await createHighlight(sampleHighlightInput());
    const h2 = await createHighlight(sampleHighlightInput());

    const count = await bulkAddHighlightsToProject([h1.id, h2.id], project.id);
    expect(count).toBe(2);
    expect((await getHighlight(h1.id))?.project_id).toBe(project.id);
    expect((await getHighlight(h2.id))?.project_id).toBe(project.id);
    expect((await getProject(project.id))?.highlight_order).toEqual([h1.id, h2.id]);
  });

  it('bulkAddTagsToHighlights merges tags without duplicates', async () => {
    const tagA = await createTag('Alpha', '#ffd34e');
    const tagB = await createTag('Beta', '#00aa88');
    const h1 = await createHighlight({ ...sampleHighlightInput(), tag_ids: [tagA.id] });
    const h2 = await createHighlight(sampleHighlightInput());

    const count = await bulkAddTagsToHighlights([h1.id, h2.id], [tagA.id, tagB.id]);
    expect(count).toBe(2);
    expect((await getHighlight(h1.id))?.tag_ids).toEqual([tagA.id, tagB.id]);
    expect((await getHighlight(h2.id))?.tag_ids).toEqual([tagA.id, tagB.id]);
  });

  it('bulkDeleteHighlights removes highlights from storage', async () => {
    const h1 = await createHighlight(sampleHighlightInput());
    const h2 = await createHighlight(sampleHighlightInput());

    const count = await bulkDeleteHighlights([h1, h2]);
    expect(count).toBe(2);
    expect(await getHighlight(h1.id)).toBeNull();
    expect(await getHighlight(h2.id)).toBeNull();
  });
});
