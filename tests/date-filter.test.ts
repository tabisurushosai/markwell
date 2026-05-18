import { describe, expect, it } from 'vitest';
import {
  filterHighlightsByDate,
  isDateFilterActive,
  resolveDateRange,
} from '../src/popup/utils/date-filter.js';

describe('date-filter', () => {
  const now = new Date('2024-06-15T15:30:00').getTime();

  it('resolves today range', () => {
    const range = resolveDateRange({ preset: 'today', customStart: '', customEnd: '' }, now);
    expect(range).not.toBeNull();
    const start = new Date(range!.start);
    expect(start.getHours()).toBe(0);
    const end = new Date(range!.end);
    expect(end.getHours()).toBe(23);
  });

  it('is inactive for all preset', () => {
    expect(isDateFilterActive({ preset: 'all', customStart: '', customEnd: '' })).toBe(false);
  });

  it('is active for custom when range set', () => {
    expect(
      isDateFilterActive({ preset: 'custom', customStart: '2024-01-01', customEnd: '2024-01-31' }),
    ).toBe(true);
  });

  it('filters highlights in 7d window', () => {
    const highlights = [
      { created_at: now - 2 * 24 * 60 * 60 * 1000 },
      { created_at: now - 10 * 24 * 60 * 60 * 1000 },
    ] as Array<{ created_at: number }>;
    const filtered = filterHighlightsByDate(
      highlights as never,
      { preset: '7d', customStart: '', customEnd: '' },
      now,
    );
    expect(filtered).toHaveLength(1);
  });
});
