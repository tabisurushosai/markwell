import { z } from 'zod';

export type LicenseStatus = {
  tier: 'free' | 'trial' | 'premium';
  license_key: string | null;
  trial_start: number | null;
  trial_end: number | null;
  last_verified_at: number | null;
  verify_failure_count: number;
};

export const LicenseStatusSchema = z.object({
  tier: z.enum(['free', 'trial', 'premium']),
  license_key: z.string().nullable(),
  trial_start: z.number().nullable(),
  trial_end: z.number().nullable(),
  last_verified_at: z.number().nullable(),
  verify_failure_count: z.number(),
});
