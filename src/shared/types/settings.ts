import { z } from 'zod';

import { HighlightColorSchema } from './highlight.js';

export type ThemePreference = 'auto' | 'dark' | 'light';

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
  translate_target_lang: z.string().default('ja'),
  stripe_payment_link: z.string().default(''),
  onboarding_seen: z.boolean(),
});

export type Settings = z.output<typeof SettingsSchema>;
