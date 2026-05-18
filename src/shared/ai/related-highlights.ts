import { callGemini } from './gemini.js';
import { assertAiAccess } from '../license/ai-access.js';
import { listHighlights } from '../storage/highlights.js';
import { getCurrentTier } from '../storage/license.js';
import { getApiKey } from '../storage/settings.js';
import type { Highlight } from '../types/highlight.js';

const MAX_CANDIDATES = 30;
const MAX_RESULTS = 5;

export function mergeRelatedCandidateHighlights(
  source: Highlight,
  groups: Highlight[][],
  maxCandidates = MAX_CANDIDATES,
): Highlight[] {
  const byId = new Map<string, Highlight>();
  for (const group of groups) {
    for (const highlight of group) {
      if (highlight.id !== source.id) {
        byId.set(highlight.id, highlight);
      }
    }
  }
  return [...byId.values()]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, maxCandidates);
}

export async function loadRelatedHighlightCandidates(
  source: Highlight,
  maxCandidates = MAX_CANDIDATES,
): Promise<Highlight[]> {
  const groups: Highlight[][] = [];

  if (source.project_id !== null) {
    groups.push(await listHighlights({ project_id: source.project_id }));
  }

  for (const tagId of source.tag_ids) {
    groups.push(await listHighlights({ tag_id: tagId }));
  }

  return mergeRelatedCandidateHighlights(source, groups, maxCandidates);
}

export function buildRelatedHighlightsPrompt(
  sourceText: string,
  candidates: Highlight[],
): string {
  const candidateText = candidates.map((h, index) => `[${index + 1}]${h.selected_text}`).join('');
  return `次のテキストと意味的に近い他のハイライトを選べ。候補:${candidateText} 返答は ID 番号配列のみ\n\n対象テキスト: ${sourceText}`;
}

export function parseRelatedHighlightIndices(
  response: string,
  candidateCount: number,
  maxResults = MAX_RESULTS,
): number[] {
  const trimmed = response.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const arrayMatch = candidate.match(/\[[\s\S]*\]/);
  if (arrayMatch === null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(arrayMatch[0]) as unknown;
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const indices: number[] = [];
  for (const item of parsed) {
    const index =
      typeof item === 'number'
        ? item
        : typeof item === 'string' && /^\d+$/.test(item.trim())
          ? Number(item.trim())
          : NaN;
    if (!Number.isInteger(index) || index < 1 || index > candidateCount) {
      continue;
    }
    if (!indices.includes(index)) {
      indices.push(index);
    }
    if (indices.length >= maxResults) {
      break;
    }
  }

  return indices;
}

export function resolveRelatedHighlights(
  candidates: Highlight[],
  indices: number[],
): Highlight[] {
  return indices
    .map((index) => candidates[index - 1])
    .filter((highlight): highlight is Highlight => highlight !== undefined);
}

export async function findRelatedHighlights(source: Highlight): Promise<Highlight[]> {
  const tier = await getCurrentTier();
  assertAiAccess(tier, 'related');

  const apiKey = await getApiKey();
  if (apiKey === null) {
    return [];
  }

  const candidates = await loadRelatedHighlightCandidates(source);
  if (candidates.length === 0) {
    return [];
  }

  const prompt = buildRelatedHighlightsPrompt(source.selected_text, candidates);
  const response = await callGemini(prompt, { feature: 'related_highlights' });
  const indices = parseRelatedHighlightIndices(response, candidates.length, MAX_RESULTS);
  return resolveRelatedHighlights(candidates, indices);
}
