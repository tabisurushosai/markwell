export const MARKWELL_FRAGMENT_PREFIX = 'markwell-';

export function highlightFragmentId(highlightId: string): string {
  return `${MARKWELL_FRAGMENT_PREFIX}${highlightId}`;
}

/** `location.hash` または `#markwell-<id>` 形式の文字列から ID を取得 */
export function parseHighlightIdFromHash(hash: string): string | null {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!normalized.startsWith(MARKWELL_FRAGMENT_PREFIX)) {
    return null;
  }
  const id = normalized.slice(MARKWELL_FRAGMENT_PREFIX.length);
  return id === '' ? null : id;
}
