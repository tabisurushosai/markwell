import { ulid } from 'ulid';
import { z } from 'zod';

import { ProjectSchema, type Project } from '../types/project.js';
import type { LicenseTier } from './highlights.js';
import { getHighlight, listHighlights, updateHighlight } from './highlights.js';
import { kvDelete, kvGet, kvListByPrefix, kvSet } from './kv.js';

const PROJECT_KEY_PREFIX = 'markwell:project:';
const INDEX_BY_PROJECT_PREFIX = 'markwell:index:by-project:';
const DEFAULT_COVER_EMOJI = '📌';

const TIER_PROJECT_LIMITS: Record<LicenseTier, number | null> = {
  free: 2,
  trial: null,
  premium: null,
};

function isSingleGrapheme(value: string): boolean {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  let count = 0;
  for (const _unused of segmenter.segment(value)) {
    void _unused;
    count += 1;
    if (count > 1) {
      return false;
    }
  }
  return count === 1;
}

const CoverEmojiSchema = z.string().refine(isSingleGrapheme, {
  message: 'cover_emoji must be a single character',
});

const StoredProjectSchema = ProjectSchema.extend({
  cover_emoji: CoverEmojiSchema,
});

export class ProjectLimitError extends Error {
  readonly tier: LicenseTier;
  readonly limit: number;
  readonly current: number;

  constructor(tier: LicenseTier, limit: number, current: number) {
    super(`Project limit reached for tier "${tier}": ${String(current)}/${String(limit)}`);
    this.name = 'ProjectLimitError';
    this.tier = tier;
    this.limit = limit;
    this.current = current;
  }
}

function projectKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

function indexByProjectKey(projectId: string): string {
  return `${INDEX_BY_PROJECT_PREFIX}${projectId}`;
}

function parseCoverEmoji(coverEmoji: string): string {
  return CoverEmojiSchema.parse(coverEmoji);
}

export async function createProject(
  name: string,
  description = '',
  coverEmoji = DEFAULT_COVER_EMOJI,
): Promise<Project> {
  const now = Date.now();
  const project: Project = {
    id: ulid(),
    name,
    description,
    cover_emoji: parseCoverEmoji(coverEmoji),
    highlight_order: [],
    created_at: now,
    updated_at: now,
  };

  await kvSet(projectKey(project.id), project, StoredProjectSchema);
  return project;
}

export async function getProject(id: string): Promise<Project | null> {
  return kvGet(projectKey(id), StoredProjectSchema);
}

export async function listProjects(): Promise<Project[]> {
  const projects = await kvListByPrefix(PROJECT_KEY_PREFIX, StoredProjectSchema);
  return projects.sort((a, b) => b.updated_at - a.updated_at);
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const existing = await getProject(id);
  if (existing === null) {
    throw new Error(`Project not found: ${id}`);
  }

  const coverEmoji =
    patch.cover_emoji === undefined ? existing.cover_emoji : parseCoverEmoji(patch.cover_emoji);

  const updated: Project = {
    ...existing,
    ...patch,
    id: existing.id,
    cover_emoji: coverEmoji,
    created_at: existing.created_at,
    updated_at: Date.now(),
  };

  await kvSet(projectKey(id), updated, StoredProjectSchema);
  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  const project = await getProject(id);
  if (project === null) {
    return;
  }

  const highlights = await listHighlights({ project_id: id });
  for (const highlight of highlights) {
    await updateHighlight(highlight.id, { project_id: null });
  }

  await kvDelete(projectKey(id));
  await kvDelete(indexByProjectKey(id));
}

export async function addHighlightToProject(projectId: string, highlightId: string): Promise<void> {
  const project = await getProject(projectId);
  if (project === null) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const highlight = await getHighlight(highlightId);
  if (highlight === null) {
    throw new Error(`Highlight not found: ${highlightId}`);
  }

  if (highlight.project_id !== null && highlight.project_id !== projectId) {
    const previousProject = await getProject(highlight.project_id);
    if (previousProject !== null) {
      await updateProject(highlight.project_id, {
        highlight_order: previousProject.highlight_order.filter((id) => id !== highlightId),
      });
    }
  }

  const highlightOrder = project.highlight_order.includes(highlightId)
    ? project.highlight_order
    : [...project.highlight_order, highlightId];

  await updateProject(projectId, { highlight_order: highlightOrder });
  await updateHighlight(highlightId, { project_id: projectId });
}

/** プロジェクトから除外（ハイライト自体は storage に残す） */
export async function removeHighlightFromProject(
  projectId: string,
  highlightId: string,
): Promise<void> {
  const project = await getProject(projectId);
  if (project === null) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const highlight = await getHighlight(highlightId);
  if (highlight === null) {
    throw new Error(`Highlight not found: ${highlightId}`);
  }

  if (highlight.project_id !== projectId) {
    return;
  }

  await updateProject(projectId, {
    highlight_order: project.highlight_order.filter((id) => id !== highlightId),
  });
  await updateHighlight(highlightId, { project_id: null });
}

export async function reorderHighlightsInProject(
  projectId: string,
  newOrder: string[],
): Promise<void> {
  const project = await getProject(projectId);
  if (project === null) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const currentIds = new Set(project.highlight_order);
  const nextIds = new Set(newOrder);
  const sameMembership =
    currentIds.size === nextIds.size && [...currentIds].every((id) => nextIds.has(id));

  if (!sameMembership) {
    throw new Error('newOrder must contain the same highlight ids as highlight_order');
  }

  await updateProject(projectId, { highlight_order: newOrder });
}

export async function countProjects(): Promise<number> {
  const projects = await kvListByPrefix(PROJECT_KEY_PREFIX, StoredProjectSchema);
  return projects.length;
}

export async function assertProjectLimit(tier: LicenseTier): Promise<void> {
  const limit = TIER_PROJECT_LIMITS[tier];
  if (limit === null) {
    return;
  }

  const current = await countProjects();
  if (current >= limit) {
    throw new ProjectLimitError(tier, limit, current);
  }
}
