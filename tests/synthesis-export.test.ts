import { describe, expect, it } from 'vitest';

import { buildSynthesisDownloadFilename } from '../src/side-panel/utils/synthesis-export.js';

describe('synthesis-export', () => {
  it('builds deterministic download filename from created_at', () => {
    const createdAt = Date.UTC(2026, 4, 18, 9, 5);
    expect(buildSynthesisDownloadFilename(createdAt)).toBe('markwell-synthesis-20260518-0905.md');
  });
});
