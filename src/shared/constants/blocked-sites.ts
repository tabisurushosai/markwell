/** 初回インストール時からブロックするドメイン */
export const DEFAULT_BLOCKED_DOMAINS = [
  'chrome.google.com',
  'chromewebstore.google.com',
  'localhost:*',
  '127.0.0.1:*',
] as const;
