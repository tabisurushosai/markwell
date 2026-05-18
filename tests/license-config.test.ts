import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STRIPE_PAYMENT_LINK,
  LICENSE_VERIFY_URL,
  resolveStripePaymentLink,
  STRIPE_ACCOUNT_ID,
} from '../src/shared/license/config.js';

describe('license config', () => {
  it('uses placeholder payment link when settings value is empty', () => {
    expect(resolveStripePaymentLink('')).toBe(DEFAULT_STRIPE_PAYMENT_LINK);
    expect(resolveStripePaymentLink('   ')).toBe(DEFAULT_STRIPE_PAYMENT_LINK);
  });

  it('uses configured payment link when set', () => {
    expect(resolveStripePaymentLink('https://buy.stripe.com/test_live_link')).toBe(
      'https://buy.stripe.com/test_live_link',
    );
  });

  it('references the expected Stripe account id', () => {
    expect(STRIPE_ACCOUNT_ID).toBe('acct_1TXZCQRSXt15GdgT');
  });

  it('points license verification to markwell-api', () => {
    expect(LICENSE_VERIFY_URL).toBe('https://markwell-api.vercel.app/api/verify-license');
  });
});
