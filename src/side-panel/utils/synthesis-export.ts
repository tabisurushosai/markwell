import type { LicenseTier } from '../../shared/storage/highlights.js';

export type SynthesisExportFormat = 'markdown' | 'obsidian' | 'roam';

export type SynthesisExportMeta = {
  createdAt: number;
  projectName: string;
  model: string;
};

export class SynthesisExportTierError extends Error {
  readonly format: SynthesisExportFormat;

  constructor(format: SynthesisExportFormat) {
    super(`Export format "${format}" requires Premium`);
    this.name = 'SynthesisExportTierError';
    this.format = format;
  }
}

export function isPremiumSynthesisExportFormat(format: SynthesisExportFormat): boolean {
  return format === 'obsidian' || format === 'roam';
}

export function assertSynthesisExportAllowed(
  tier: LicenseTier,
  format: SynthesisExportFormat,
): void {
  if (isPremiumSynthesisExportFormat(format) && tier !== 'premium') {
    throw new SynthesisExportTierError(format);
  }
}

function slugTag(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_\-\u3040-\u30ff\u4e00-\u9fff]/gi, '');
  return slug === '' ? 'project' : slug;
}

function yamlString(value: string): string {
  if (/[:#\n"'[\]{}]/.test(value) || value.startsWith(' ') || value.endsWith(' ')) {
    return JSON.stringify(value);
  }
  return value;
}

function toIsoUtc(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function toObsidianWikilinks(markdown: string): string {
  const withLinks = markdown.replace(/\[([^\]]+)\]\([^)]+\)/g, '[[$1]]');
  return withLinks.replace(/^(#{1,6})\s+(.+)$/gm, (_line, hashes: string, title: string) => {
    const trimmed = title.trim();
    if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
      return `${hashes} ${trimmed}`;
    }
    return `${hashes} [[${trimmed}]]`;
  });
}

export function formatSynthesisForExport(
  markdown: string,
  format: SynthesisExportFormat,
  meta: SynthesisExportMeta,
): string {
  if (format === 'markdown') {
    return markdown;
  }

  const projectTag = slugTag(meta.projectName);

  if (format === 'obsidian') {
    const tags = ['markwell', 'synthesis', projectTag];
    const frontMatter = [
      '---',
      `title: ${yamlString('Markwell Synthesis')}`,
      `created: ${toIsoUtc(meta.createdAt)}`,
      'tags:',
      ...tags.map((tag) => `  - ${tag}`),
      `model: ${yamlString(meta.model)}`,
      `project: ${yamlString(meta.projectName)}`,
      '---',
      '',
    ].join('\n');
    return `${frontMatter}${toObsidianWikilinks(markdown)}\n`;
  }

  const roamTags = ['#markwell', '#synthesis', `#${projectTag}`].join(' ');
  const lines = markdown.split('\n');
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading !== null) {
      const title = heading[2]?.trim() ?? '';
      bullets.push(`- [[${title}]]`);
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bullets.push(`  ${trimmed}`);
      continue;
    }
    bullets.push(`- ${trimmed}`);
  }

  return `${roamTags}\n\n${bullets.join('\n')}\n`;
}

export function buildSynthesisDownloadFilename(
  createdAt: number,
  format: SynthesisExportFormat = 'markdown',
): string {
  const date = new Date(createdAt);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp = `${String(date.getUTCFullYear())}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
  const suffix =
    format === 'markdown' ? '' : format === 'obsidian' ? '-obsidian' : '-roam';
  return `markwell-synthesis-${stamp}${suffix}.md`;
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportSynthesis(
  tier: LicenseTier,
  format: SynthesisExportFormat,
  markdown: string,
  meta: SynthesisExportMeta,
): void {
  assertSynthesisExportAllowed(tier, format);
  const content = formatSynthesisForExport(markdown, format, meta);
  downloadTextFile(content, buildSynthesisDownloadFilename(meta.createdAt, format));
}

export async function copySynthesisMarkdown(markdown: string): Promise<void> {
  await navigator.clipboard.writeText(markdown);
}

/** @deprecated use exportSynthesis */
export function downloadSynthesisMarkdown(markdown: string, createdAt: number): void {
  downloadTextFile(markdown, buildSynthesisDownloadFilename(createdAt, 'markdown'));
}
