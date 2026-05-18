import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearMonthlyUsage,
  createEmptyMonthlyUsage,
  currentUsageMonth,
  getMonthlyUsage,
  recordUsage,
  usageStorageKey,
} from '../src/shared/ai/usage.js';

const storage = new Map<string, unknown>();

vi.mock('../src/shared/storage/kv.js', () => ({
  kvGet: vi.fn(async (key: string) => storage.get(key) ?? null),
  kvSet: vi.fn(async (key: string, value: unknown) => {
    storage.set(key, structuredClone(value));
  }),
  kvDelete: vi.fn(async (key: string) => {
    storage.delete(key);
  }),
}));

describe('usage', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('usageStorageKey uses YYYY-MM suffix', () => {
    expect(usageStorageKey('2026-05')).toBe('markwell:usage:2026-05');
  });

  it('recordUsage aggregates monthly totals locally', async () => {
    const month = currentUsageMonth(new Date('2026-05-18T12:00:00'));

    await recordUsage({
      model: 'gemini-2.0-flash',
      token_input: 100,
      token_output: 50,
      feature: 'synthesis',
    });
    await recordUsage({
      model: 'gemini-2.0-flash',
      token_input: 20,
      token_output: 10,
      feature: 'auto_tag',
    });

    const usage = await getMonthlyUsage(month);
    expect(usage.request_count).toBe(2);
    expect(usage.token_input).toBe(120);
    expect(usage.token_output).toBe(60);
    expect(usage.by_feature.synthesis).toEqual({
      request_count: 1,
      token_input: 100,
      token_output: 50,
    });
    expect(usage.by_feature.auto_tag).toEqual({
      request_count: 1,
      token_input: 20,
      token_output: 10,
    });
    expect(usage.by_model['gemini-2.0-flash']).toEqual({
      request_count: 2,
      token_input: 120,
      token_output: 60,
    });
    expect(storage.has(usageStorageKey(month))).toBe(true);
  });

  it('getMonthlyUsage returns empty totals when no data exists', async () => {
    const month = '2099-01';
    await expect(getMonthlyUsage(month)).resolves.toEqual(createEmptyMonthlyUsage(month));
  });

  it('clearMonthlyUsage removes stored month data', async () => {
    const month = currentUsageMonth(new Date('2026-05-18T12:00:00'));
    vi.setSystemTime(new Date('2026-05-18T12:00:00'));

    await recordUsage({
      model: 'gemini-2.0-flash',
      token_input: 10,
      token_output: 5,
      feature: 'translation',
    });
    expect(storage.has(usageStorageKey(month))).toBe(true);

    await clearMonthlyUsage(month);
    expect(storage.has(usageStorageKey(month))).toBe(false);
    await expect(getMonthlyUsage(month)).resolves.toEqual(createEmptyMonthlyUsage(month));

    vi.useRealTimers();
  });
});
