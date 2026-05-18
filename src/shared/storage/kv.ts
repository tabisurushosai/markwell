import { type ZodType } from 'zod';

const HIGHLIGHT_TEXT_WARN_BYTES = 100 * 1024;

function hasSelectedText(value: unknown): value is { selected_text: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'selected_text' in value &&
    typeof (value as Record<string, unknown>).selected_text === 'string'
  );
}

function warnIfLargeHighlight(value: unknown): void {
  if (!hasSelectedText(value)) {
    return;
  }

  const byteSize = new TextEncoder().encode(value.selected_text).length;
  if (byteSize > HIGHLIGHT_TEXT_WARN_BYTES) {
    console.warn(
      `[markwell] highlight selected_text exceeds 100KB (${String(byteSize)} bytes); saving anyway`,
    );
  }
}

function formatZodError(key: string, message: string): string {
  return `Storage validation failed for key "${key}": ${message}`;
}

export async function kvGet<T>(key: string, schema: ZodType<T>): Promise<T | null> {
  const result = await chrome.storage.local.get(key);
  const raw = result[key];
  if (raw === undefined) {
    return null;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(formatZodError(key, parsed.error.message));
  }

  return parsed.data;
}

export async function kvSet<T>(key: string, value: T, schema: ZodType<T>): Promise<void> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(formatZodError(key, parsed.error.message));
  }

  warnIfLargeHighlight(parsed.data);
  await chrome.storage.local.set({ [key]: parsed.data });
}

export async function kvDelete(key: string): Promise<void> {
  await chrome.storage.local.remove(key);
}

export async function kvListByPrefix<T>(prefix: string, schema: ZodType<T>): Promise<T[]> {
  const all = await chrome.storage.local.get(null);
  const items: T[] = [];

  for (const [key, raw] of Object.entries(all)) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(formatZodError(key, parsed.error.message));
    }

    items.push(parsed.data);
  }

  return items;
}
