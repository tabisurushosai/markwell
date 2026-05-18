import { describe, expect, it, vi } from 'vitest';

import {
  buildRephrasePrompt,
  canUseRephrase,
  getRephraseStyleLabel,
  parseRephraseResponse,
  rephraseHighlightText,
} from '../src/shared/ai/rephrase.js';

vi.mock('../src/shared/storage/settings.js', () => ({
  getApiKey: vi.fn(),
}));

vi.mock('../src/shared/ai/gemini.js', () => ({
  callGemini: vi.fn(),
}));

describe('rephrase', () => {
  it('canUseRephrase allows trial and premium only', () => {
    expect(canUseRephrase('free')).toBe(false);
    expect(canUseRephrase('trial')).toBe(true);
    expect(canUseRephrase('premium')).toBe(true);
  });

  it('buildRephrasePrompt includes style instruction', () => {
    expect(buildRephrasePrompt('テキスト', 'polite')).toContain('丁寧');
    expect(buildRephrasePrompt('テキスト', 'concise')).toContain('簡潔');
    expect(buildRephrasePrompt('テキスト', 'academic')).toContain('学術');
    expect(buildRephrasePrompt('テキスト', 'casual')).toContain('カジュアル');
    expect(buildRephrasePrompt('hello', 'polite')).toContain('hello');
  });

  it('getRephraseStyleLabel returns Japanese labels', () => {
    expect(getRephraseStyleLabel('polite')).toBe('丁寧');
    expect(getRephraseStyleLabel('academic')).toBe('学術調');
  });

  it('rephraseHighlightText calls Gemini when API key is set', async () => {
    const { getApiKey } = await import('../src/shared/storage/settings.js');
    const { callGemini } = await import('../src/shared/ai/gemini.js');
    vi.mocked(getApiKey).mockResolvedValue('key');
    vi.mocked(callGemini).mockResolvedValue('  言い換え結果  ');

    const result = await rephraseHighlightText('元の文', 'concise');
    expect(result).toBe('言い換え結果');
    expect(parseRephraseResponse('  x  ')).toBe('x');
  });
});
