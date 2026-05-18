/** Stripe account: acct_1TXZCQRSXt15GdgT — 他アカウントは参照しない */
export const STRIPE_ACCOUNT_ID = 'acct_1TXZCQRSXt15GdgT';

/** markwell-100 で実 URL に置換 */
export const DEFAULT_STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/REPLACE_ME';

/** ライセンスキー検証 API（後続タスクで実装・接続） */
export const LICENSE_VERIFY_URL = 'https://markwell-license.verify/REPLACE_ME';

export function resolveStripePaymentLink(settingsLink: string): string {
  const configured = settingsLink.trim();
  return configured !== '' ? configured : DEFAULT_STRIPE_PAYMENT_LINK;
}
