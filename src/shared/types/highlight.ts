import { z } from 'zod';

export type HighlightColor = 'yellow' | 'green' | 'pink' | 'blue' | 'orange';

export const HighlightColorSchema = z.enum(['yellow', 'green', 'pink', 'blue', 'orange']);

export type HighlightAnchor = {
  type: 'rangy';
  serialized: string;
  fallback: {
    text: string;
    occurrence: number;
  };
};

export const HighlightAnchorSchema = z.object({
  type: z.literal('rangy'),
  serialized: z.string(),
  fallback: z.object({
    text: z.string(),
    occurrence: z.number().int().nonnegative(),
  }),
});

export type Highlight = {
  id: string;
  url: string;
  url_canonical: string;
  page_title: string;
  selected_text: string;
  context_before: string;
  context_after: string;
  anchor: HighlightAnchor;
  color: HighlightColor;
  note: string;
  tag_ids: string[];
  project_id: string | null;
  ai_tags: string[];
  /** 言語コード → 翻訳文 */
  translation_cache: Record<string, string>;
  created_at: number;
  updated_at: number;
  domain: string;
  favicon_data_url: string;
};

export const HighlightSchema = z.object({
  id: z.string(),
  url: z.string(),
  url_canonical: z.string(),
  page_title: z.string(),
  selected_text: z.string(),
  context_before: z.string(),
  context_after: z.string(),
  anchor: HighlightAnchorSchema,
  color: HighlightColorSchema,
  note: z.string(),
  tag_ids: z.array(z.string()),
  project_id: z.string().nullable(),
  ai_tags: z.array(z.string()),
  translation_cache: z.record(z.string(), z.string()).default({}),
  created_at: z.number(),
  updated_at: z.number(),
  domain: z.string(),
  favicon_data_url: z.string(),
});
