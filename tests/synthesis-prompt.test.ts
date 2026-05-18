import { describe, expect, it } from 'vitest';
import type { Highlight } from '../src/shared/types/highlight.js';
import {
  buildSynthesisPrompt,
  DEFAULT_SYNTHESIS_INSTRUCTION,
  estimateTokens,
  extractUserInstructionFromPrompt,
  getSynthesisTokenWarning,
  SYNTHESIS_TOKEN_WARNING_THRESHOLD,
} from '../src/shared/ai/synthesis-prompt.js';

function sampleHighlight(index: number, overrides: Partial<Highlight> = {}): Highlight {
  return {
    id: `h${index}`,
    url: `https://example.com/p/${index}`,
    url_canonical: `https://example.com/p/${index}`,
    page_title: `ページ ${index}`,
    selected_text: `ハイライト本文 ${index}`,
    context_before: '',
    context_after: '',
    anchor: {
      type: 'rangy',
      serialized: '',
      fallback: { text: `ハイライト本文 ${index}`, occurrence: 0 },
    },
    color: 'yellow',
    note: index % 3 === 0 ? `メモ ${index}` : '',
    tag_ids: [],
    project_id: 'proj-1',
    ai_tags: [],
    created_at: 1_700_000_000_000 + index,
    updated_at: 0,
    domain: 'example.com',
    favicon_data_url: '',
    ...overrides,
  };
}

const tenHighlights = Array.from({ length: 10 }, (_, index) => sampleHighlight(index + 1));

describe('synthesis-prompt', () => {
  it('uses default instruction when userInstruction is empty', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, '');
    expect(prompt).toContain(`指示: ${DEFAULT_SYNTHESIS_INSTRUCTION}`);
    expect(prompt).not.toContain('指示: \n');
  });

  it('uses trimmed custom instruction', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, '  比較表にまとめて  ');
    expect(prompt).toContain('指示: 比較表にまとめて');
  });

  it('formats 10 highlights with numbering and metadata', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, 'テスト指示');
    expect(prompt).toContain('10 件のハイライト');
    for (let i = 1; i <= 10; i += 1) {
      expect(prompt).toContain(`[${i}] ハイライト本文 ${i} (出典: ページ ${i}, example.com)`);
    }
    expect(prompt).toContain('ノート: メモ 3');
    expect(prompt).toContain('ノート: メモ 6');
    expect(prompt).toContain('ノート: メモ 9');
  });

  it('includes output format line', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, 'x');
    expect(prompt).toContain(
      '出力形式: 日本語の Markdown。各論点ごとに見出し + 関連するハイライト番号 [N] を引用形式で本文中に挿入。',
    );
  });

  it('estimateTokens uses 0.7 tokens per character', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('a'.repeat(10))).toBeCloseTo(7, 5);
    expect(estimateTokens('あ'.repeat(100))).toBeCloseTo(70, 5);
  });

  it('returns warning when estimated tokens exceed 8000', () => {
    const longText = 'x'.repeat(12_000);
    expect(estimateTokens(longText)).toBeGreaterThan(SYNTHESIS_TOKEN_WARNING_THRESHOLD);
    const warning = getSynthesisTokenWarning(longText);
    expect(warning).not.toBeNull();
    expect(warning).toContain('8000');
  });

  it('returns null warning under threshold', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, '短い指示');
    expect(getSynthesisTokenWarning(prompt)).toBeNull();
  });

  it('produces stable full prompt for 10 highlights (snapshot)', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, '共通テーマを論じて');
    expect(prompt).toMatchInlineSnapshot(`
      "あなたは熟練のリサーチアシスタントです。以下は私が Web 上から集めた 10 件のハイライトです。
      これらを統合し、次の指示に従って論考としてまとめてください。

      指示: 共通テーマを論じて

      ハイライト:
      [1] ハイライト本文 1 (出典: ページ 1, example.com)
          ノート: 
      [2] ハイライト本文 2 (出典: ページ 2, example.com)
          ノート: 
      [3] ハイライト本文 3 (出典: ページ 3, example.com)
          ノート: メモ 3
      [4] ハイライト本文 4 (出典: ページ 4, example.com)
          ノート: 
      [5] ハイライト本文 5 (出典: ページ 5, example.com)
          ノート: 
      [6] ハイライト本文 6 (出典: ページ 6, example.com)
          ノート: メモ 6
      [7] ハイライト本文 7 (出典: ページ 7, example.com)
          ノート: 
      [8] ハイライト本文 8 (出典: ページ 8, example.com)
          ノート: 
      [9] ハイライト本文 9 (出典: ページ 9, example.com)
          ノート: メモ 9
      [10] ハイライト本文 10 (出典: ページ 10, example.com)
          ノート: 

      出力形式: 日本語の Markdown。各論点ごとに見出し + 関連するハイライト番号 [N] を引用形式で本文中に挿入。"
    `);
  });

  it('extractUserInstructionFromPrompt restores custom instruction', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, '比較表にまとめて');
    expect(extractUserInstructionFromPrompt(prompt)).toBe('比較表にまとめて');
  });

  it('extractUserInstructionFromPrompt returns empty for default instruction', () => {
    const prompt = buildSynthesisPrompt(tenHighlights, '');
    expect(extractUserInstructionFromPrompt(prompt)).toBe('');
  });
});
