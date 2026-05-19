import { describe, expect, it } from 'vitest';

import type { Tag } from '../src/shared/types/tag.js';
import {
  buildTagAutocompleteOptions,
  formatTagAutocompleteLabel,
  matchesTagPrefix,
} from '../src/popup/utils/tag-autocomplete.js';

function tag(id: string, name: string): Tag {
  return { id, name, color: '#ffd34e', created_at: 0 };
}

describe('tag autocomplete', () => {
  const tags = [tag('1', 'Alpha'), tag('2', 'Beta'), tag('3', 'gamma')];

  it('matchesTagPrefix is case-insensitive prefix match', () => {
    expect(matchesTagPrefix('Alpha', 'al')).toBe(true);
    expect(matchesTagPrefix('gamma', 'Gam')).toBe(true);
    expect(matchesTagPrefix('Beta', 'Alp')).toBe(false);
    expect(matchesTagPrefix('Alpha', '')).toBe(true);
  });

  it('buildTagAutocompleteOptions returns all tags when query is empty', () => {
    const options = buildTagAutocompleteOptions(tags, '', []);
    expect(
      options.map((option) => (option.kind === 'existing' ? option.tag.name : option.name)),
    ).toEqual(['Alpha', 'Beta', 'gamma']);
  });

  it('buildTagAutocompleteOptions filters by prefix', () => {
    const options = buildTagAutocompleteOptions(tags, 'Al', []);
    expect(
      options.map((option) => (option.kind === 'existing' ? option.tag.name : option.name)),
    ).toEqual(['Alpha']);
  });

  it('buildTagAutocompleteOptions excludes tags already on highlight', () => {
    const options = buildTagAutocompleteOptions(tags, '', ['1', '2']);
    expect(options).toHaveLength(1);
    expect(options[0]?.kind).toBe('existing');
    if (options[0]?.kind === 'existing') {
      expect(options[0].tag.name).toBe('gamma');
    }
  });

  it('buildTagAutocompleteOptions offers create when no prefix match', () => {
    const options = buildTagAutocompleteOptions(tags, 'novel', []);
    expect(options).toEqual([{ kind: 'create', name: 'novel' }]);
    expect(formatTagAutocompleteLabel(options[0])).toBe('Create: "novel"');
  });

  it('buildTagAutocompleteOptions does not offer create for empty query', () => {
    expect(buildTagAutocompleteOptions(tags, '   ', [])).toHaveLength(3);
    expect(buildTagAutocompleteOptions(tags, '', []).every((option) => option.kind === 'existing')).toBe(
      true,
    );
  });
});
