import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { kvDelete, kvGet, kvListByPrefix, kvSet } from '../src/shared/storage/kv.js';

const ItemSchema = z.object({
  id: z.string(),
  label: z.string(),
});

type Item = z.infer<typeof ItemSchema>;

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

describe('kv storage wrapper', () => {
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

  it('kvSet and kvGet round-trip a validated value', async () => {
    const item: Item = { id: '01HZ', label: 'note' };
    await kvSet('markwell:item:01HZ', item, ItemSchema);

    const loaded = await kvGet('markwell:item:01HZ', ItemSchema);
    expect(loaded).toEqual(item);
  });

  it('kvGet returns null for a missing key', async () => {
    const loaded = await kvGet('markwell:item:missing', ItemSchema);
    expect(loaded).toBeNull();
  });

  it('kvSet throws when validation fails', async () => {
    await expect(
      kvSet('markwell:item:bad', { id: 'bad' } as never, ItemSchema),
    ).rejects.toThrow(/Storage validation failed/);
  });

  it('kvDelete removes a key', async () => {
    await kvSet('markwell:item:01HZ', { id: '01HZ', label: 'a' }, ItemSchema);
    await kvDelete('markwell:item:01HZ');

    const loaded = await kvGet('markwell:item:01HZ', ItemSchema);
    expect(loaded).toBeNull();
  });

  it('kvListByPrefix returns only matching keys', async () => {
    await kvSet('markwell:item:a', { id: 'a', label: 'A' }, ItemSchema);
    await kvSet('markwell:item:b', { id: 'b', label: 'B' }, ItemSchema);
    await kvSet('markwell:other:c', { id: 'c', label: 'C' }, ItemSchema);

    const items = await kvListByPrefix('markwell:item:', ItemSchema);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });

  it('warns but still saves highlight with selected_text over 100KB', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bigText = 'x'.repeat(100 * 1024 + 1);
    const HighlightLikeSchema = z.object({
      selected_text: z.string(),
    });

    await kvSet(
      'markwell:highlight:big',
      { selected_text: bigText },
      HighlightLikeSchema,
    );

    const loaded = await kvGet('markwell:highlight:big', HighlightLikeSchema);
    expect(loaded?.selected_text).toHaveLength(bigText.length);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('selected_text exceeds 100KB'),
    );

    warnSpy.mockRestore();
  });
});
