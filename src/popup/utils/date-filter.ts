import type { Highlight } from '../../shared/types/highlight.js';

export type DateFilterPreset = 'all' | 'today' | '7d' | '30d' | 'custom';

export type DateFilterValue = {
  preset: DateFilterPreset;
  customStart: string;
  customEnd: string;
};

export const DEFAULT_DATE_FILTER: DateFilterValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

export function isDateFilterActive(filter: DateFilterValue): boolean {
  if (filter.preset === 'all') {
    return false;
  }
  if (filter.preset === 'custom') {
    return filter.customStart !== '' && filter.customEnd !== '';
  }
  return true;
}

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function parseDateInput(value: string, endOfDay: boolean): number | null {
  if (value === '') {
    return null;
  }
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date.getTime();
}

/** フィルタ適用用の [start, end]（ミリ秒）。`all` は null */
export function resolveDateRange(filter: DateFilterValue, now = Date.now()): {
  start: number;
  end: number;
} | null {
  switch (filter.preset) {
    case 'all':
      return null;
    case 'today':
      return { start: startOfLocalDay(now), end: endOfLocalDay(now) };
    case '7d':
      return { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
    case '30d':
      return { start: now - 30 * 24 * 60 * 60 * 1000, end: now };
    case 'custom': {
      const start = parseDateInput(filter.customStart, false);
      const end = parseDateInput(filter.customEnd, true);
      if (start === null || end === null) {
        return null;
      }
      return { start, end: Math.max(end, start) };
    }
    default:
      return null;
  }
}

export function filterHighlightsByDate(
  highlights: Highlight[],
  filter: DateFilterValue,
  now = Date.now(),
): Highlight[] {
  const range = resolveDateRange(filter, now);
  if (range === null) {
    return highlights;
  }
  return highlights.filter(
    (highlight) => highlight.created_at >= range.start && highlight.created_at <= range.end,
  );
}
