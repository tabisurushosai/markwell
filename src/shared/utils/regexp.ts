export function isValidRegExp(pattern: string): boolean {
  try {
    void new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export function findInvalidRegExpPattern(patterns: readonly string[]): string | null {
  for (const pattern of patterns) {
    if (!isValidRegExp(pattern)) {
      return pattern;
    }
  }
  return null;
}
