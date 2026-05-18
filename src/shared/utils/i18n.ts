export function t(key: string, substitutions?: string | string[]): string {
  const subs =
    substitutions === undefined
      ? undefined
      : Array.isArray(substitutions)
        ? substitutions
        : [substitutions];
  const message = subs !== undefined ? chrome.i18n.getMessage(key, subs) : chrome.i18n.getMessage(key);
  if (!message) {
    console.warn(`[markwell] Missing i18n key: ${key}`);
    return `__MISSING:${key}__`;
  }
  return message;
}
