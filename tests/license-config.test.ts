import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STRIPE_PAYMENT_LINK,
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
});
