import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Highlight } from '../src/shared/types/highlight.js';
import { createHighlight, getHighlight } from '../src/shared/storage/highlights.js';
import {
  addHighlightToProject,
  assertProjectLimit,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  ProjectLimitError,
  removeHighlightFromProject,
  reorderHighlightsInProject,
  updateProject,
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

describe('project CRUD', () => {
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

  it('create → get → list → update → add/reorder → delete', async () => {
    const project = await createProject('Essay', 'Draft notes', '📝');
    expect(project.cover_emoji).toBe('📝');

    const loaded = await getProject(project.id);
    expect(loaded).toEqual(project);
    expect(await listProjects()).toHaveLength(1);

    const updated = await updateProject(project.id, { name: 'Essay v2' });
    expect(updated.name).toBe('Essay v2');

    const h1 = await createHighlight(sampleHighlightInput());
    const h2 = await createHighlight(sampleHighlightInput());

    await addHighlightToProject(project.id, h1.id);
    await addHighlightToProject(project.id, h2.id);

    let current = await getProject(project.id);
    expect(current?.highlight_order).toEqual([h1.id, h2.id]);
    expect((await getHighlight(h1.id))?.project_id).toBe(project.id);

    await reorderHighlightsInProject(project.id, [h2.id, h1.id]);
    current = await getProject(project.id);
    expect(current?.highlight_order).toEqual([h2.id, h1.id]);

    await removeHighlightFromProject(project.id, h1.id);
    current = await getProject(project.id);
    expect(current?.highlight_order).toEqual([h2.id]);
    expect((await getHighlight(h1.id))?.project_id).toBeNull();
    expect((await getHighlight(h2.id))?.project_id).toBe(project.id);

    await deleteProject(project.id);
    expect(await getProject(project.id)).toBeNull();
    expect((await getHighlight(h1.id))?.project_id).toBeNull();
    expect((await getHighlight(h2.id))?.project_id).toBeNull();
  });

  it('assertProjectLimit throws ProjectLimitError for free tier at 2 projects', async () => {
    await createProject('One');
    await createProject('Two');

    await expect(assertProjectLimit('free')).rejects.toBeInstanceOf(ProjectLimitError);
    await expect(assertProjectLimit('premium')).resolves.toBeUndefined();
  });
});
