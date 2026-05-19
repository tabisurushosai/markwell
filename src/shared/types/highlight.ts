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
  translation_cache: z
    .record(z.string(), z.string())
    .optional()
    .transform((value) => value ?? {}),
  created_at: z.number(),
  updated_at: z.number(),
  domain: z.string(),
  favicon_data_url: z.string(),
});

export type Highlight = z.output<typeof HighlightSchema>;
