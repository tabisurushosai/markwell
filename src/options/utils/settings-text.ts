export function formatSettingLines(values: readonly string[]): string {
  return values.join('\n');
}

export function parseSettingLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

export function clampFontScale(value: number): number {
  return Math.min(1.4, Math.max(0.8, value));
}
