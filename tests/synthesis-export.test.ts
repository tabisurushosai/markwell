import { describe, expect, it } from 'vitest';

import { SynthesisExportTierError } from '../src/side-panel/utils/synthesis-export.js';
import {
  assertSynthesisExportAllowed,
  buildSynthesisDownloadFilename,
  exportSynthesis,
  formatSynthesisForExport,
  toObsidianWikilinks,
} from '../src/side-panel/utils/synthesis-export.js';

const meta = {
  createdAt: Date.UTC(2026, 4, 18, 9, 5),
  projectName: 'Research Notes',
  model: 'gemini-2.0-flash',
};

describe('synthesis-export', () => {
  it('builds deterministic download filename from created_at', () => {
    expect(buildSynthesisDownloadFilename(meta.createdAt)).toBe('markwell-synthesis-20260518-0905.md');
    expect(buildSynthesisDownloadFilename(meta.createdAt, 'obsidian')).toBe(
      'markwell-synthesis-20260518-0905-obsidian.md',
    );
    expect(buildSynthesisDownloadFilename(meta.createdAt, 'roam')).toBe(
      'markwell-synthesis-20260518-0905-roam.md',
    );
  });

  it('converts headings and links to Obsidian wikilinks', () => {
    const input = '## Theme\n\nSee [note](https://example.com).';
    expect(toObsidianWikilinks(input)).toBe('## [[Theme]]\n\nSee [[note]].');
  });

  it('wraps Obsidian export with front matter and tags', () => {
    const output = formatSynthesisForExport('# Body', 'obsidian', meta);
    expect(output).toContain('---');
    expect(output).toContain('tags:');
    expect(output).toContain('- synthesis');
    expect(output).toContain('- research-notes');
    expect(output).toContain('# [[Body]]');
  });

  it('formats Roam export with hashtags and bullets', () => {
    const output = formatSynthesisForExport('## Summary\n\nFirst point.', 'roam', meta);
    expect(output.startsWith('#markwell #synthesis #research-notes')).toBe(true);
    expect(output).toContain('- [[Summary]]');
    expect(output).toContain('- First point.');
  });

  it('blocks premium formats for free and trial at export function level', () => {
    expect(() => { assertSynthesisExportAllowed('free', 'obsidian'); }).toThrow(SynthesisExportTierError);
    expect(() => { assertSynthesisExportAllowed('trial', 'roam'); }).toThrow(SynthesisExportTierError);
    expect(() => { assertSynthesisExportAllowed('premium', 'obsidian'); }).not.toThrow();

    expect(() =>
      { exportSynthesis('trial', 'obsidian', '# x', meta); },
    ).toThrow(SynthesisExportTierError);
  });
});
