import { z } from 'zod';

import { HighlightSchema, type Highlight } from '../types/highlight.js';
import { ProjectSchema } from '../types/project.js';
import { SynthesisSchema } from '../types/synthesis.js';
import { TagSchema } from '../types/tag.js';
import { CURRENT_SCHEMA_VERSION, getSchemaVersion } from './migrations.js';
import { kvDelete, kvGet, kvListByPrefix, kvSet } from './kv.js';

const HIGHLIGHT_KEY_PREFIX = 'markwell:highlight:';
const TAG_KEY_PREFIX = 'markwell:tag:';
const PROJECT_KEY_PREFIX = 'markwell:project:';
const SYNTHESIS_KEY_PREFIX = 'markwell:synthesis:';
const INDEX_KEY_PREFIX = 'markwell:index:';

const PRESERVED_KEY_PREFIXES = [
  'markwell:settings',
  'markwell:license',
  'markwell:crypto:',
  'markwell:schema_version',
] as const;

const TagColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const StoredTagSchema = TagSchema.extend({ color: TagColorSchema });

const IndexSchema = z.array(z.string());

const ExportPayloadSchema = z.object({
  schema_version: z.number().int().nonnegative(),
  exported_at: z.number(),
  highlights: z.array(HighlightSchema),
  tags: z.array(StoredTagSchema),
  projects: z.array(ProjectSchema),
  syntheses: z.array(SynthesisSchema),
});

export type ExportPayload = z.infer<typeof ExportPayloadSchema>;

export type ImportResult = {
  imported: {
    highlights: number;
    tags: number;
    projects: number;
    syntheses: number;
  };
};

function isPortableKey(key: string): boolean {
  if (PRESERVED_KEY_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))) {
    return false;
  }
  return (
    key.startsWith(HIGHLIGHT_KEY_PREFIX) ||
    key.startsWith(TAG_KEY_PREFIX) ||
    key.startsWith(PROJECT_KEY_PREFIX) ||
    key.startsWith(SYNTHESIS_KEY_PREFIX) ||
    key.startsWith(INDEX_KEY_PREFIX)
  );
}

async function sha1Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function indexByUrlKey(urlCanonical: string): Promise<string> {
  return `${INDEX_KEY_PREFIX}by-url:${await sha1Hex(urlCanonical)}`;
}

function indexByTagKey(tagId: string): string {
  return `${INDEX_KEY_PREFIX}by-tag:${tagId}`;
}

function indexByProjectKey(projectId: string): string {
  return `${INDEX_KEY_PREFIX}by-project:${projectId}`;
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

async function addHighlightToIndexes(highlight: Highlight): Promise<void> {
  await addToIndex(await indexByUrlKey(highlight.url_canonical), highlight.id);
  for (const tagId of highlight.tag_ids) {
    await addToIndex(indexByTagKey(tagId), highlight.id);
  }
  if (highlight.project_id !== null) {
    await addToIndex(indexByProjectKey(highlight.project_id), highlight.id);
  }
}

async function snapshotPortableStorage(): Promise<Record<string, unknown>> {
  const all = await chrome.storage.local.get(null);
  const snapshot: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(all)) {
    if (isPortableKey(key)) {
      snapshot[key] = value;
    }
  }
  return snapshot;
}

async function clearPortableStorage(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter(isPortableKey);
  if (keys.length > 0) {
    await chrome.storage.local.remove(keys);
  }
}

async function restorePortableSnapshot(snapshot: Record<string, unknown>): Promise<void> {
  await clearPortableStorage();
  if (Object.keys(snapshot).length > 0) {
    await chrome.storage.local.set(snapshot);
  }
}

async function clearHighlightIndexes(): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const indexKeys = Object.keys(all).filter((key) => key.startsWith(INDEX_KEY_PREFIX));
  if (indexKeys.length > 0) {
    await chrome.storage.local.remove(indexKeys);
  }
}

async function rebuildHighlightIndexes(highlights: Highlight[]): Promise<void> {
  await clearHighlightIndexes();
  for (const highlight of highlights) {
    await addHighlightToIndexes(highlight);
  }
}

function tagKey(id: string): string {
  return `${TAG_KEY_PREFIX}${id}`;
}

function projectKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

function highlightKey(id: string): string {
  return `${HIGHLIGHT_KEY_PREFIX}${id}`;
}

function synthesisKey(id: string): string {
  return `${SYNTHESIS_KEY_PREFIX}${id}`;
}

async function writePortableEntities(payload: ExportPayload): Promise<void> {
  for (const tag of payload.tags) {
    await kvSet(tagKey(tag.id), tag, StoredTagSchema);
  }
  for (const project of payload.projects) {
    await kvSet(projectKey(project.id), project, ProjectSchema);
  }
  for (const synthesis of payload.syntheses) {
    await kvSet(synthesisKey(synthesis.id), synthesis, SynthesisSchema);
  }
  for (const highlight of payload.highlights) {
    await kvSet(highlightKey(highlight.id), highlight, HighlightSchema);
  }
}

export async function exportAll(): Promise<ExportPayload> {
  const [highlights, tags, projects, syntheses, schemaVersion] = await Promise.all([
    kvListByPrefix(HIGHLIGHT_KEY_PREFIX, HighlightSchema),
    kvListByPrefix(TAG_KEY_PREFIX, StoredTagSchema),
    kvListByPrefix(PROJECT_KEY_PREFIX, ProjectSchema),
    kvListByPrefix(SYNTHESIS_KEY_PREFIX, SynthesisSchema),
    getSchemaVersion(),
  ]);

  return {
    schema_version: schemaVersion,
    exported_at: Date.now(),
    highlights,
    tags,
    projects,
    syntheses,
  };
}

export async function importAll(json: unknown, mode: 'merge' | 'replace'): Promise<ImportResult> {
  const snapshot = await snapshotPortableStorage();

  try {
    const payload = ExportPayloadSchema.parse(json);

    if (mode === 'replace') {
      await clearPortableStorage();
    }

    await writePortableEntities(payload);

    const allHighlights = await kvListByPrefix(HIGHLIGHT_KEY_PREFIX, HighlightSchema);
    await rebuildHighlightIndexes(allHighlights);

    return {
      imported: {
        highlights: payload.highlights.length,
        tags: payload.tags.length,
        projects: payload.projects.length,
        syntheses: payload.syntheses.length,
      },
    };
  } catch (error) {
    await restorePortableSnapshot(snapshot);
    throw error;
  }
}

export { ExportPayloadSchema, CURRENT_SCHEMA_VERSION };
