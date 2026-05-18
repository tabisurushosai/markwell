import { describe, expect, it } from 'vitest';

import {
  buildGeminiTurnsFromSession,
  buildProjectQaSystemInstruction,
  canUseProjectQa,
  PROJECT_QA_SYSTEM_PROMPT,
} from '../src/shared/ai/project-qa.js';
import type { Highlight } from '../src/shared/types/highlight.js';

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: 'h1',
    url: 'https://example.com',
    url_canonical: 'https://example.com',
    page_title: 'ページ',
    selected_text: 'サンプル本文',
    context_before: '',
    context_after: '',
    anchor: { type: 'rangy', serialized: '', fallback: { text: '', occurrence: 0 } },
    color: 'yellow',
    note: 'メモ',
    tag_ids: [],
    project_id: 'proj-1',
    ai_tags: [],
    created_at: 1,
    updated_at: 1,
    domain: 'example.com',
    favicon_data_url: '',
    ...overrides,
  };
}

describe('project-qa', () => {
  it('canUseProjectQa allows trial and premium only', () => {
    expect(canUseProjectQa('free')).toBe(false);
    expect(canUseProjectQa('trial')).toBe(true);
    expect(canUseProjectQa('premium')).toBe(true);
  });

  it('buildProjectQaSystemInstruction includes numbered highlights', () => {
    const instruction = buildProjectQaSystemInstruction([
      makeHighlight({ selected_text: '一つ目' }),
      makeHighlight({ id: 'h2', selected_text: '二つ目' }),
    ]);

    expect(instruction).toContain(PROJECT_QA_SYSTEM_PROMPT);
    expect(instruction).toContain('以下はこのプロジェクトのハイライト');
    expect(instruction).toContain('[1] 一つ目');
    expect(instruction).toContain('[2] 二つ目');
  });

  it('buildGeminiTurnsFromSession maps roles', () => {
    const turns = buildGeminiTurnsFromSession([
      { role: 'user', content: '質問' },
      { role: 'assistant', content: '回答' },
    ]);

    expect(turns).toEqual([
      { role: 'user', text: '質問' },
      { role: 'model', text: '回答' },
    ]);
  });
});
