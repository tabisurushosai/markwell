import { ulid } from 'ulid';
import { z } from 'zod';

import { TagSchema, type Tag } from '../types/tag.js';
import { listHighlights, updateHighlight } from './highlights.js';
import { kvDelete, kvGet, kvListByPrefix, kvSet } from './kv.js';

const TAG_KEY_PREFIX = 'markwell:tag:';
const INDEX_BY_TAG_PREFIX = 'markwell:index:by-tag:';

const IndexSchema = z.array(z.string());

const TagColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const StoredTagSchema = TagSchema.extend({
  color: TagColorSchema,
});

function tagKey(id: string): string {
  return `${TAG_KEY_PREFIX}${id}`;
}

function indexByTagKey(tagId: string): string {
  return `${INDEX_BY_TAG_PREFIX}${tagId}`;
}

function parseTagColor(color: string): string {
  return TagColorSchema.parse(color);
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const existing = (await listTags()).find((tag) => tag.name === name);
  if (existing !== undefined) {
    return existing;
  }

  const tag: Tag = {
    id: ulid(),
    name,
    color: parseTagColor(color),
    created_at: Date.now(),
  };

  await kvSet(tagKey(tag.id), tag, StoredTagSchema);
  return tag;
}

export async function getTag(id: string): Promise<Tag | null> {
  return kvGet(tagKey(id), StoredTagSchema);
}

export async function listTags(): Promise<Tag[]> {
  const tags = await kvListByPrefix(TAG_KEY_PREFIX, StoredTagSchema);
  return tags.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

export async function getTagUsageCounts(): Promise<Record<string, number>> {
  const all = await chrome.storage.local.get(null);
  const counts: Record<string, number> = {};

  for (const [key, raw] of Object.entries(all)) {
    if (!key.startsWith(INDEX_BY_TAG_PREFIX)) {
      continue;
    }
    const tagId = key.slice(INDEX_BY_TAG_PREFIX.length);
    const parsed = IndexSchema.safeParse(raw);
    counts[tagId] = parsed.success ? parsed.data.length : 0;
  }

  return counts;
}

export async function renameTag(id: string, newName: string): Promise<Tag> {
  const tag = await getTag(id);
  if (tag === null) {
    throw new Error(`Tag not found: ${id}`);
  }

  const duplicate = (await listTags()).find((entry) => entry.name === newName && entry.id !== id);
  if (duplicate !== undefined) {
    throw new Error(`Tag name already exists: ${newName}`);
  }

  const updated: Tag = {
    ...tag,
    name: newName,
  };

  await kvSet(tagKey(id), updated, StoredTagSchema);
  return updated;
}

export async function updateTagColor(id: string, color: string): Promise<Tag> {
  const tag = await getTag(id);
  if (tag === null) {
    throw new Error(`Tag not found: ${id}`);
  }

  const parsedColor = parseTagColor(color);
  if (tag.color.toLowerCase() === parsedColor.toLowerCase()) {
    return tag;
  }

  const updated: Tag = {
    ...tag,
    color: parsedColor,
  };

  await kvSet(tagKey(id), updated, StoredTagSchema);
  return updated;
}

export async function mergeTag(sourceId: string, targetId: string): Promise<void> {
  if (sourceId === targetId) {
    return;
  }

  const source = await getTag(sourceId);
  if (source === null) {
    throw new Error(`Tag not found: ${sourceId}`);
  }

  const target = await getTag(targetId);
  if (target === null) {
    throw new Error(`Tag not found: ${targetId}`);
  }

  const highlights = await listHighlights({ tag_id: sourceId });
  for (const highlight of highlights) {
    const tagIds = highlight.tag_ids.filter((tagId) => tagId !== sourceId);
    if (!tagIds.includes(targetId)) {
      tagIds.push(targetId);
    }
    await updateHighlight(highlight.id, { tag_ids: tagIds });
  }

  await kvDelete(tagKey(sourceId));
  await kvDelete(indexByTagKey(sourceId));
}

export async function deleteTag(id: string): Promise<void> {
  const tag = await getTag(id);
  if (tag === null) {
    return;
  }

  const highlights = await listHighlights({ tag_id: id });
  for (const highlight of highlights) {
    await updateHighlight(highlight.id, {
      tag_ids: highlight.tag_ids.filter((tagId) => tagId !== id),
    });
  }

  await kvDelete(tagKey(id));
  await kvDelete(indexByTagKey(id));
}
