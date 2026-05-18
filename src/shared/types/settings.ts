import { z } from 'zod';

import { HighlightColorSchema, type HighlightColor } from './highlight.js';

export type ThemePreference = 'auto' | 'dark' | 'light';

export type Settings = {
  default_color: HighlightColor;
  theme: ThemePreference;
  font_scale: number;
  density: 'compact' | 'normal' | 'comfortable';
  blocked_domains: string[];
  blocked_url_patterns: string[];
  ai: {
    provider: 'gemini';
    api_key_encrypted: string;
    model: string;
    /** ハイライト保存時に AI 自動タグ付け（trial / premium） */
    auto_tag_on_save: boolean;
  };
  shortcuts: {
    quick_highlight: string;
    open_synthesis: string;
  };
  onboarding_seen: boolean;
};

export const SettingsSchema = z.object({
  default_color: HighlightColorSchema,
  theme: z.enum(['auto', 'dark', 'light']).default('dark'),
  font_scale: z.number(),
  density: z.enum(['compact', 'normal', 'comfortable']),
  blocked_domains: z.array(z.string()),
  blocked_url_patterns: z.array(z.string()),
  ai: z.object({
    provider: z.literal('gemini'),
    api_key_encrypted: z.string(),
    model: z.string(),
    auto_tag_on_save: z.boolean().default(true),
  }),
  shortcuts: z.object({
    quick_highlight: z.string(),
    open_synthesis: z.string(),
  }),
  onboarding_seen: z.boolean(),
});
