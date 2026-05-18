import { callGemini } from './gemini.js';
import { getCurrentTier } from '../storage/license.js';
import { getApiKey, getSettings } from '../storage/settings.js';
import { updateHighlight } from '../storage/highlights.js';

export function buildAutoTagPrompt(selectedText: string): string {
  return `次のテキストから 1-3 個のタグを抽出。日本語1〜3語のタグを JSON 配列で。本文: ${selectedText}`;
}

export function parseAutoTagResponse(response: string): string[] {
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

  const tags: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') {
      continue;
    }
    const tag = item.trim();
    if (tag === '') {
      continue;
    }
    tags.push(tag);
    if (tags.length >= 3) {
      break;
    }
  }

  return tags;
}

export async function fetchAutoTagsForHighlight(selectedText: string): Promise<string[]> {
  const text = selectedText.trim();
  if (text === '') {
    return [];
  }

  const prompt = buildAutoTagPrompt(text);
  const response = await callGemini(prompt);
  return parseAutoTagResponse(response);
}

export async function maybeApplyAutoTagsAfterCreate(
  highlightId: string,
  selectedText: string,
): Promise<void> {
  try {
    const tier = await getCurrentTier();
    if (tier !== 'trial' && tier !== 'premium') {
      return;
    }

    const settings = await getSettings();
    if (!settings.ai.auto_tag_on_save) {
      return;
    }

    const apiKey = await getApiKey();
    if (apiKey === null) {
      return;
    }

    const aiTags = await fetchAutoTagsForHighlight(selectedText);
    if (aiTags.length === 0) {
      return;
    }

    await updateHighlight(highlightId, { ai_tags: aiTags });
  } catch {
    // 失敗時はサイレントに無視（ハイライト保存は完了済み）
  }
}
