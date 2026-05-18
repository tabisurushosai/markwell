export const FONT_SCALE_MIN = 0.8;
export const FONT_SCALE_MAX = 1.4;

export function clampFontScale(value: number): number {
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));
}

export function linesFromTextarea(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

export function textareaFromLines(lines: readonly string[]): string {
  return lines.join('\n');
}

export { findInvalidRegExpPattern, isValidRegExp } from '../../shared/utils/regexp.js';
