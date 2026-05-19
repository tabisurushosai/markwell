import { describe, expect, it } from 'vitest';

import {
  buildMarkwellExportFilename,
  formatImportResultMessage,
} from '../src/options/utils/export-download.js';

describe('export download helpers', () => {
  it('buildMarkwellExportFilename uses YYYY-MM-DD', () => {
    expect(buildMarkwellExportFilename(new Date('2026-05-18T12:00:00'))).toBe(
      'markwell-export-2026-05-18.json',
    );
  });

  it('formatImportResultMessage summarizes counts', () => {
    expect(
      formatImportResultMessage({
        imported: { highlights: 3, tags: 2, projects: 1, syntheses: 0 },
      }),
    ).toBe('Import complete: 3 highlights, 2 tags, 1 projects, 0 syntheses');
  });
});
