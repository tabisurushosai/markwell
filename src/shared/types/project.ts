import { z } from 'zod';

export type Project = {
  id: string;
  name: string;
  description: string;
  cover_emoji: string;
  highlight_order: string[];
  created_at: number;
  updated_at: number;
};

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  cover_emoji: z.string(),
  highlight_order: z.array(z.string()),
  created_at: z.number(),
  updated_at: z.number(),
});
