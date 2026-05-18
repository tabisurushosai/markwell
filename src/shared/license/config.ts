/** markwell-100 直前に実 URL に置換 */
export const DEFAULT_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/REPLACE_ME';

/** 参照用 Stripe アカウント ID（Payment Link 方式以外では使用しない） */
export const STRIPE_ACCOUNT_ID = 'acct_1TXZCQRSXt15GdgT';

export function resolveStripePaymentLink(stripePaymentLink: string): string {
  const trimmed = stripePaymentLink.trim();
  return trimmed !== '' ? trimmed : DEFAULT_STRIPE_PAYMENT_LINK;
}
