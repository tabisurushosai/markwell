export function buildSynthesisDownloadFilename(createdAt: number): string {
  const date = new Date(createdAt);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `markwell-synthesis-${String(date.getUTCFullYear())}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}.md`;
}

export async function copySynthesisMarkdown(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown);
}

export function downloadSynthesisMarkdown(markdown: string, createdAt: number): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildSynthesisDownloadFilename(createdAt);
  anchor.click();
  URL.revokeObjectURL(url);
}
