import { describe, expect, it, vi } from 'vitest';

import {
  buildAutoTagPrompt,
  maybeApplyAutoTagsAfterCreate,
  parseAutoTagResponse,
} from '../src/shared/ai/auto-tag.js';
import { updateHighlight } from '../src/shared/storage/highlights.js';

vi.mock('../src/shared/storage/highlights.js', () => ({
  updateHighlight: vi.fn(),
}));

vi.mock('../src/shared/storage/license.js', () => ({
  getCurrentTier: vi.fn(),
}));

vi.mock('../src/shared/storage/settings.js', () => ({
  getSettings: vi.fn(),
  getApiKey: vi.fn(),
}));

vi.mock('../src/shared/ai/gemini.js', () => ({
  callGemini: vi.fn(),
}));

describe('auto-tag', () => {
  it('buildAutoTagPrompt includes selected text', () => {
    expect(buildAutoTagPrompt('量子コンピュータの基礎')).toContain('量子コンピュータの基礎');
    expect(buildAutoTagPrompt('量子コンピュータの基礎')).toContain('JSON 配列');
  });

  it('parseAutoTagResponse extracts up to 3 string tags from JSON array', () => {
    expect(parseAutoTagResponse('["AI", "研究", "技術", "余分"]')).toEqual(['AI', '研究', '技術']);
    expect(parseAutoTagResponse('```json\n["タグA", "タグB"]\n```')).toEqual(['タグA', 'タグB']);
    expect(parseAutoTagResponse('説明文 ["単一"] 末尾')).toEqual(['単一']);
    expect(parseAutoTagResponse('not json')).toEqual([]);
  });

  it('maybeApplyAutoTagsAfterCreate skips when tier is free', async () => {
    const { getCurrentTier } = await import('../src/shared/storage/license.js');
    vi.mocked(getCurrentTier).mockResolvedValue('free');

    await maybeApplyAutoTagsAfterCreate('hl-1', 'text');

    expect(updateHighlight).not.toHaveBeenCalled();
  });

  it('maybeApplyAutoTagsAfterCreate updates ai_tags on trial when enabled', async () => {
    const { getCurrentTier } = await import('../src/shared/storage/license.js');
    const { getSettings, getApiKey } = await import('../src/shared/storage/settings.js');
    const { callGemini } = await import('../src/shared/ai/gemini.js');

    vi.mocked(getCurrentTier).mockResolvedValue('trial');
    vi.mocked(getSettings).mockResolvedValue({
      default_color: 'yellow',
      theme: 'dark',
      font_scale: 1,
      density: 'normal',
      blocked_domains: [],
      blocked_url_patterns: [],
      ai: {
        provider: 'gemini',
        api_key_encrypted: 'enc',
        model: 'gemini-2.0-flash',
        auto_tag_on_save: true,
      },
      shortcuts: { quick_highlight: 'Alt+H', open_synthesis: 'Alt+S' },
      onboarding_seen: false,
    });
    vi.mocked(getApiKey).mockResolvedValue('key');
    vi.mocked(callGemini).mockResolvedValue('["科学", "未来"]');
    vi.mocked(updateHighlight).mockResolvedValue({} as never);

    await maybeApplyAutoTagsAfterCreate('hl-2', '本文');

    expect(updateHighlight).toHaveBeenCalledWith('hl-2', { ai_tags: ['科学', '未来'] });
  });
});
