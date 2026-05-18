export type JumpToHighlightResponse = { ok: boolean };

export function isJumpToHighlightResponse(value: unknown): value is JumpToHighlightResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as JumpToHighlightResponse).ok === 'boolean'
  );
}
