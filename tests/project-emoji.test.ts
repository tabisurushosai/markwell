import { describe, expect, it } from 'vitest';

import {
  FALLBACK_PROJECT_EMOJI,
  formatProjectCoverEmoji,
  isSingleGraphemeEmoji,
} from '../src/shared/utils/project-emoji.js';

describe('project-emoji', () => {
  it('formatProjectCoverEmoji returns fallback for empty values', () => {
    expect(formatProjectCoverEmoji('')).toBe(FALLBACK_PROJECT_EMOJI);
    expect(formatProjectCoverEmoji('   ')).toBe(FALLBACK_PROJECT_EMOJI);
    expect(formatProjectCoverEmoji(null)).toBe(FALLBACK_PROJECT_EMOJI);
    expect(formatProjectCoverEmoji(undefined)).toBe(FALLBACK_PROJECT_EMOJI);
  });

  it('formatProjectCoverEmoji returns stored emoji when valid', () => {
    expect(formatProjectCoverEmoji('📝')).toBe('📝');
    expect(formatProjectCoverEmoji('  🚀  ')).toBe('🚀');
  });

  it('formatProjectCoverEmoji falls back when more than one grapheme', () => {
    expect(formatProjectCoverEmoji('📝📝')).toBe(FALLBACK_PROJECT_EMOJI);
    expect(formatProjectCoverEmoji('ab')).toBe(FALLBACK_PROJECT_EMOJI);
  });

  it('isSingleGraphemeEmoji accepts one grapheme and rejects empty or multiple', () => {
    expect(isSingleGraphemeEmoji('📝')).toBe(true);
    expect(isSingleGraphemeEmoji('')).toBe(false);
    expect(isSingleGraphemeEmoji('📝📝')).toBe(false);
    expect(isSingleGraphemeEmoji('ab')).toBe(false);
  });
});
