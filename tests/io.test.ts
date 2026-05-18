import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHighlight } from '../src/shared/storage/highlights.js';
import { exportAll, importAll } from '../src/shared/storage/io.js';
import { createProject } from '../src/shared/storage/projects.js';
import { getApiKey, setApiKey } from '../src/shared/storage/settings.js';
import { createTag } from '../src/shared/storage/tags.js';
import type { Highlight } from '../src/shared/types/highlight.js';

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
    url: 'https://example.com/doc',
    url_canonical: 'https://example.com/doc',
    page_title: 'Doc',
    selected_text: 'quote',
    context_before: '',
    context_after: '',
    anchor: {
      type: 'rangy',
      serialized: 'range',
      fallback: { text: 'quote', occurrence: 0 },
    },
    color: 'yellow',
    note: 'note',
    tag_ids: [],
    project_id: null,
    ai_tags: [],
    translation_cache: {},
    domain: 'example.com',
    favicon_data_url: '',
  };
}

function sortExportPayload(payload: Awaited<ReturnType<typeof exportAll>>) {
  return {
    ...payload,
    highlights: [...payload.highlights].sort((a, b) => a.id.localeCompare(b.id)),
    tags: [...payload.tags].sort((a, b) => a.id.localeCompare(b.id)),
    projects: [...payload.projects].sort((a, b) => a.id.localeCompare(b.id)),
    syntheses: [...payload.syntheses].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

describe('export / import', () => {
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

  it('export → import (replace) preserves portable data', async () => {
    const tag = await createTag('Read', '#aabbcc');
    const project = await createProject('Paper', 'desc', '📚');
    const highlight = await createHighlight({
      ...sampleHighlightInput(),
      tag_ids: [tag.id],
      project_id: project.id,
    });
    await setApiKey('secret-should-not-export');

    const exported = await exportAll();
    expect(exported.highlights).toHaveLength(1);
    expect(exported.tags).toHaveLength(1);
    expect(exported.projects).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toContain('secret-should-not-export');

    await importAll(exported, 'replace');

    const reimported = sortExportPayload(await exportAll());
    const expected = sortExportPayload({
      ...exported,
      exported_at: reimported.exported_at,
      schema_version: reimported.schema_version,
    });

    expect(reimported.highlights[0]?.id).toBe(highlight.id);
    expect(reimported.tags[0]?.name).toBe('Read');
    expect(reimported.projects[0]?.name).toBe('Paper');
    expect(reimported.highlights).toEqual(expected.highlights);
    expect(reimported.tags).toEqual(expected.tags);
    expect(reimported.projects).toEqual(expected.projects);

    expect(await getApiKey()).toBe('secret-should-not-export');
  });

  it('rolls back entire import when validation fails', async () => {
    await createTag('Keep', '#112233');
    await createHighlight(sampleHighlightInput());

    const exported = await exportAll();
    const invalid = {
      ...exported,
      highlights: exported.highlights.map((highlight) => ({
        ...highlight,
        color: 'not-a-color',
      })),
    };

    await expect(importAll(invalid, 'replace')).rejects.toThrow();
    expect((await exportAll()).tags).toHaveLength(1);
    expect((await exportAll()).highlights).toHaveLength(1);
  });
});
