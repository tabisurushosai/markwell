import { ulid } from 'ulid';
import { z } from 'zod';

import { HighlightSchema, type Highlight } from '../types/highlight.js';
import { kvDelete, kvGet, kvListByPrefix, kvSet } from './kv.js';

const HIGHLIGHT_KEY_PREFIX = 'markwell:highlight:';
const INDEX_BY_URL_PREFIX = 'markwell:index:by-url:';
const INDEX_BY_TAG_PREFIX = 'markwell:index:by-tag:';
const INDEX_BY_PROJECT_PREFIX = 'markwell:index:by-project:';

const IndexSchema = z.array(z.string());

export type LicenseTier = 'free' | 'trial' | 'premium';

const TIER_HIGHLIGHT_LIMITS: Record<LicenseTier, number> = {
  free: 50,
  trial: 500,
  premium: 5000,
};

export class TierLimitError extends Error {
  readonly tier: LicenseTier;
  readonly limit: number;
  readonly current: number;

  constructor(tier: LicenseTier, limit: number, current: number) {
    super(`Highlight limit reached for tier "${tier}": ${String(current)}/${String(limit)}`);
    this.name = 'TierLimitError';
    this.tier = tier;
    this.limit = limit;
    this.current = current;
  }
}

function highlightKey(id: string): string {
  return `${HIGHLIGHT_KEY_PREFIX}${id}`;
}

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function indexByUrlKey(urlCanonical: string): Promise<string> {
  return `${INDEX_BY_URL_PREFIX}${await sha1Hex(urlCanonical)}`;
}

function indexByTagKey(tagId: string): string {
  return `${INDEX_BY_TAG_PREFIX}${tagId}`;
}

function indexByProjectKey(projectId: string): string {
  return `${INDEX_BY_PROJECT_PREFIX}${projectId}`;
}

async function getIndexIds(indexKey: string): Promise<string[]> {
  return (await kvGet(indexKey, IndexSchema)) ?? [];
}

async function setIndexIds(indexKey: string, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    await kvDelete(indexKey);
    return;
  }
  await kvSet(indexKey, ids, IndexSchema);
}

async function addToIndex(indexKey: string, highlightId: string): Promise<void> {
  const ids = await getIndexIds(indexKey);
  if (ids.includes(highlightId)) {
    return;
  }
  await setIndexIds(indexKey, [...ids, highlightId]);
}

async function removeFromIndex(indexKey: string, highlightId: string): Promise<void> {
  const ids = await getIndexIds(indexKey);
  await setIndexIds(
    indexKey,
    ids.filter((id) => id !== highlightId),
  );
}

async function addHighlightToIndexes(highlight: Highlight): Promise<void> {
  await addToIndex(await indexByUrlKey(highlight.url_canonical), highlight.id);
  for (const tagId of highlight.tag_ids) {
    await addToIndex(indexByTagKey(tagId), highlight.id);
  }
  if (highlight.project_id !== null) {
    await addToIndex(indexByProjectKey(highlight.project_id), highlight.id);
  }
}

async function removeHighlightFromIndexes(highlight: Highlight): Promise<void> {
  await removeFromIndex(await indexByUrlKey(highlight.url_canonical), highlight.id);
  for (const tagId of highlight.tag_ids) {
    await removeFromIndex(indexByTagKey(tagId), highlight.id);
  }
  if (highlight.project_id !== null) {
    await removeFromIndex(indexByProjectKey(highlight.project_id), highlight.id);
  }
}

function intersectIds(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((id) => right.has(id)));
}

export async function createHighlight(
  input: Omit<Highlight, 'id' | 'created_at' | 'updated_at'>,
): Promise<Highlight> {
  const now = Date.now();
  const highlight: Highlight = {
    ...input,
    id: ulid(),
    created_at: now,
    updated_at: now,
  };

  await kvSet(highlightKey(highlight.id), highlight, HighlightSchema);
  await addHighlightToIndexes(highlight);
  return highlight;
}

export async function getHighlight(id: string): Promise<Highlight | null> {
  const stored = await kvGet(highlightKey(id), HighlightSchema);
  if (stored === null) {
    return null;
  }
  return HighlightSchema.parse(stored);
}

export async function updateHighlight(id: string, patch: Partial<Highlight>): Promise<Highlight> {
  const existing = await getHighlight(id);
  if (existing === null) {
    throw new Error(`Highlight not found: ${id}`);
  }

  const updated: Highlight = {
    ...existing,
    ...patch,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: Date.now(),
  };

  await removeHighlightFromIndexes(existing);
  await kvSet(highlightKey(id), updated, HighlightSchema);
  await addHighlightToIndexes(updated);
  return updated;
}

export async function deleteHighlight(id: string): Promise<void> {
  const existing = await getHighlight(id);
  if (existing === null) {
    return;
  }

  await removeHighlightFromIndexes(existing);
  await kvDelete(highlightKey(id));
}

export async function listHighlights(
  opts?: {
    url_canonical?: string;
    tag_id?: string;
    project_id?: string;
    limit?: number;
    offset?: number;
  },
): Promise<Highlight[]> {
  let candidateIds: Set<string> | null = null;

  if (opts?.url_canonical !== undefined) {
    const urlIds = new Set(await getIndexIds(await indexByUrlKey(opts.url_canonical)));
    candidateIds = urlIds;
  }

  if (opts?.tag_id !== undefined) {
    const tagIds = new Set(await getIndexIds(indexByTagKey(opts.tag_id)));
    candidateIds = candidateIds === null ? tagIds : intersectIds(candidateIds, tagIds);
  }

  if (opts?.project_id !== undefined) {
    const projectIds = new Set(await getIndexIds(indexByProjectKey(opts.project_id)));
    candidateIds = candidateIds === null ? projectIds : intersectIds(candidateIds, projectIds);
  }

  const highlights =
    candidateIds === null
      ? (await kvListByPrefix(HIGHLIGHT_KEY_PREFIX, HighlightSchema)).map((item) =>
          HighlightSchema.parse(item),
        )
      : (
          await Promise.all(
            [...candidateIds].map(async (id) => getHighlight(id)),
          )
        ).filter((highlight): highlight is Highlight => highlight !== null);

  const sorted = highlights.sort((a, b) => b.created_at - a.created_at);
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit;

  if (limit === undefined) {
    return sorted.slice(offset);
  }

  return sorted.slice(offset, offset + limit);
}

export async function countHighlights(): Promise<number> {
  const highlights = await kvListByPrefix(HIGHLIGHT_KEY_PREFIX, HighlightSchema);
  return highlights.map((item) => HighlightSchema.parse(item)).length;
}

export async function assertHighlightLimit(tier: LicenseTier): Promise<void> {
  const limit = TIER_HIGHLIGHT_LIMITS[tier];
  const current = await countHighlights();
  if (current >= limit) {
    throw new TierLimitError(tier, limit, current);
  }
}
