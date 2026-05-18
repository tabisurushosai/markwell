import { ulid } from 'ulid';
import { z } from 'zod';

import { SynthesisSchema, type Synthesis } from '../types/synthesis.js';
import { kvDelete, kvGet, kvListByPrefix, kvSet } from './kv.js';

const SYNTHESIS_KEY_PREFIX = 'markwell:synthesis:';
const INDEX_BY_PROJECT_PREFIX = 'markwell:index:synthesis-by-project:';

const IndexSchema = z.array(z.string());

function synthesisKey(id: string): string {
  return `${SYNTHESIS_KEY_PREFIX}${id}`;
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

async function addToIndex(indexKey: string, synthesisId: string): Promise<void> {
  const ids = await getIndexIds(indexKey);
  if (ids.includes(synthesisId)) {
    return;
  }
  await setIndexIds(indexKey, [...ids, synthesisId]);
}

async function removeFromIndex(indexKey: string, synthesisId: string): Promise<void> {
  const ids = await getIndexIds(indexKey);
  await setIndexIds(
    indexKey,
    ids.filter((id) => id !== synthesisId),
  );
}

export async function createSynthesis(
  input: Omit<Synthesis, 'id' | 'created_at'>,
): Promise<Synthesis> {
  const synthesis: Synthesis = {
    ...input,
    id: ulid(),
    created_at: Date.now(),
  };

  await kvSet(synthesisKey(synthesis.id), synthesis, SynthesisSchema);
  await addToIndex(indexByProjectKey(synthesis.project_id), synthesis.id);
  return synthesis;
}

export async function getSynthesis(id: string): Promise<Synthesis | null> {
  return kvGet(synthesisKey(id), SynthesisSchema);
}

export async function updateSynthesis(id: string, patch: Partial<Synthesis>): Promise<Synthesis> {
  const existing = await getSynthesis(id);
  if (existing === null) {
    throw new Error(`Synthesis not found: ${id}`);
  }

  const updated: Synthesis = {
    ...existing,
    ...patch,
    id: existing.id,
    created_at: existing.created_at,
  };

  if (patch.project_id !== undefined && patch.project_id !== existing.project_id) {
    await removeFromIndex(indexByProjectKey(existing.project_id), existing.id);
    await addToIndex(indexByProjectKey(updated.project_id), updated.id);
  }

  await kvSet(synthesisKey(id), updated, SynthesisSchema);
  return updated;
}

export async function deleteSynthesis(id: string): Promise<void> {
  const existing = await getSynthesis(id);
  if (existing === null) {
    return;
  }

  await removeFromIndex(indexByProjectKey(existing.project_id), existing.id);
  await kvDelete(synthesisKey(id));
}

export async function listSyntheses(
  opts?: {
    project_id?: string;
    limit?: number;
    offset?: number;
  },
): Promise<Synthesis[]> {
  const syntheses =
    opts?.project_id !== undefined
      ? (
          await Promise.all(
            (await getIndexIds(indexByProjectKey(opts.project_id))).map(async (id) =>
              getSynthesis(id),
            ),
          )
        ).filter((item): item is Synthesis => item !== null)
      : await kvListByPrefix(SYNTHESIS_KEY_PREFIX, SynthesisSchema);

  const sorted = syntheses.sort((a, b) => b.created_at - a.created_at);
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit;

  if (limit === undefined) {
    return sorted.slice(offset);
  }

  return sorted.slice(offset, offset + limit);
}

/** import 後にプロジェクト別インデックスを再構築する */
export async function rebuildSynthesisIndexes(syntheses: Synthesis[]): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const indexKeys = Object.keys(all).filter((key) =>
    key.startsWith(INDEX_BY_PROJECT_PREFIX),
  );
  if (indexKeys.length > 0) {
    await chrome.storage.local.remove(indexKeys);
  }

  for (const synthesis of syntheses) {
    await addToIndex(indexByProjectKey(synthesis.project_id), synthesis.id);
  }
}
