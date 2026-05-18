import { z } from 'zod';

export type Synthesis = {
  id: string;
  project_id: string;
  prompt: string;
  result_markdown: string;
  model: string;
  token_input: number;
  token_output: number;
  created_at: number;
};

export const SynthesisSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  prompt: z.string(),
  result_markdown: z.string(),
  model: z.string(),
  token_input: z.number(),
  token_output: z.number(),
  created_at: z.number(),
});
