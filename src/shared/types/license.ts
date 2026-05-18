import { z } from 'zod';

export type LicenseStatus = {
  tier: 'free' | 'trial' | 'premium';
  license_key: string | null;
  trial_start: number | null;
  trial_end: number | null;
  last_verified_at: number | null;
  verify_failure_count: number;
  license_revoked_at: number | null;
};

export const LicenseStatusSchema = z.object({
  tier: z.enum(['free', 'trial', 'premium']),
  license_key: z.string().nullable(),
  trial_start: z.number().nullable(),
  trial_end: z.number().nullable(),
  last_verified_at: z.number().nullable(),
  verify_failure_count: z.number(),
  license_revoked_at: z.number().nullable(),
});
