import { describe, expect, it } from 'vitest';

import { GeminiError } from '../src/shared/ai/gemini.js';
import {
  formatSynthesisError,
  isSynthesisAbortError,
} from '../src/side-panel/utils/synthesis-errors.js';

describe('synthesis-errors', () => {
  it('maps GeminiError kinds to user messages', () => {
    expect(formatSynthesisError(new GeminiError('x', 'AUTH', 403))).toContain('API キー');
    expect(formatSynthesisError(new GeminiError('x', 'QUOTA', 429))).toContain('上限');
  });

  it('detects abort errors', () => {
    expect(isSynthesisAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true);
    expect(isSynthesisAbortError(new Error('other'))).toBe(false);
  });
});
