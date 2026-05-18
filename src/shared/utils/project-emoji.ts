export const FALLBACK_PROJECT_EMOJI = '📁';

/** 1 グラフェム以内か（`Array.from` ベース。入力の maxlength 制限は使わない） */
export function isSingleGraphemeEmoji(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') {
    return false;
  }
  return Array.from(trimmed).length <= 1;
}

/** 未設定・空・不正な値のときは 📁 を返す */
export function formatProjectCoverEmoji(coverEmoji: string | undefined | null): string {
  const trimmed = (coverEmoji ?? '').trim();
  if (trimmed === '') {
    return FALLBACK_PROJECT_EMOJI;
  }
  if (isSingleGraphemeEmoji(trimmed)) {
    return trimmed;
  }
  return FALLBACK_PROJECT_EMOJI;
}
