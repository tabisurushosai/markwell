import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Highlight } from '../src/shared/types/highlight.js';
import {
  assertHighlightLimit,
  createHighlight,
  TierLimitError,
} from '../src/shared/storage/highlights.js';
import {
  assertProjectLimit,
  createProject,
  ProjectLimitError,
} from '../src/shared/storage/projects.js';

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
  };
}

function sampleHighlightInput(): Omit<Highlight, 'id' | 'created_at' | 'updated_at'> {
  return {
    url: 'https://example.com/page',
    url_canonical: 'https://example.com/page',
    page_title: 'Example',
    selected_text: 'hello',
    context_before: '',
    context_after: '',
    anchor: {
      type: 'rangy',
      serialized: 'serialized',
      fallback: { text: 'hello', occurrence: 0 },
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

describe('tier limits', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', { storage: { local: createFakeChromeStorage() } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks free tier at 50 highlights', async () => {
    for (let i = 0; i < 50; i += 1) {
      await createHighlight(sampleHighlightInput());
    }

    await expect(assertHighlightLimit('free')).rejects.toMatchObject({
      name: 'TierLimitError',
      tier: 'free',
      limit: 50,
      current: 50,
    });
  });

  it('allows premium tier below 5000 highlights', async () => {
    for (let i = 0; i < 3; i += 1) {
      await createHighlight(sampleHighlightInput());
    }

    await expect(assertHighlightLimit('premium')).resolves.toBeUndefined();
  });

  it('blocks trial tier at 500 highlights', async () => {
    for (let i = 0; i < 500; i += 1) {
      await createHighlight(sampleHighlightInput());
    }

    await expect(assertHighlightLimit('trial')).rejects.toBeInstanceOf(TierLimitError);
  });

  it('blocks free tier at 2 projects and allows trial unlimited', async () => {
    await createProject('One');
    await createProject('Two');

    await expect(assertProjectLimit('free')).rejects.toBeInstanceOf(ProjectLimitError);
    await expect(assertProjectLimit('trial')).resolves.toBeUndefined();
    await expect(assertProjectLimit('premium')).resolves.toBeUndefined();
  });
});
