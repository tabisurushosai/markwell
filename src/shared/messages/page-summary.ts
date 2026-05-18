export type GetPageTextMessage = {
  type: 'GET_PAGE_TEXT';
};

export type GetPageTextResponse =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; reason: string };

export type SummarizePageMessage = {
  type: 'SUMMARIZE_PAGE';
  text: string;
  page_title?: string;
};

export type SummarizePageResponse =
  | { ok: true; summary: string }
  | { ok: false; error: string; code?: 'PREMIUM_REQUIRED' };

export function isGetPageTextResponse(value: unknown): value is GetPageTextResponse {
  if (typeof value !== 'object' || value === null || !('ok' in value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.ok === true) {
    return typeof record.text === 'string' && typeof record.truncated === 'boolean';
  }
  return record.ok === false && typeof record.reason === 'string';
}

export function isSummarizePageResponse(value: unknown): value is SummarizePageResponse {
  if (typeof value !== 'object' || value === null || !('ok' in value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.ok === true) {
    return typeof record.summary === 'string';
  }
  return record.ok === false && typeof record.error === 'string';
}
