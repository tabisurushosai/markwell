import { z } from 'zod';

export type Tag = {
  id: string;
  name: string;
  color: string;
  created_at: number;
};

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  created_at: z.number(),
});
