export function t(key: string): string {
  const message = chrome.i18n.getMessage(key);
  if (!message) {
    console.warn(`[markwell] Missing i18n key: ${key}`);
    return `__MISSING:${key}__`;
  }
  return message;
}
