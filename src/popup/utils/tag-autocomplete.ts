import type { Tag } from '../../shared/types/tag.js';
import { t } from '../../shared/utils/i18n.js';

export type TagAutocompleteOption =
  | { kind: 'existing'; tag: Tag }
  | { kind: 'create'; name: string };

export function normalizeTagQuery(query: string): string {
  return query.trim();
}

/** Prefix match (case-insensitive) */
export function matchesTagPrefix(tagName: string, query: string): boolean {
  const normalized = normalizeTagQuery(query).toLowerCase();
  if (normalized === '') {
    return true;
  }
  return tagName.toLowerCase().startsWith(normalized);
}

export function buildTagAutocompleteOptions(
  allTags: readonly Tag[],
  query: string,
  excludeTagIds: readonly string[],
): TagAutocompleteOption[] {
  const exclude = new Set(excludeTagIds);
  const matches = allTags
    .filter((tag) => !exclude.has(tag.id))
    .filter((tag) => matchesTagPrefix(tag.name, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  const options: TagAutocompleteOption[] = matches.map((tag) => ({
    kind: 'existing',
    tag,
  }));

  const trimmed = normalizeTagQuery(query);
  if (trimmed !== '' && matches.length === 0) {
    options.push({ kind: 'create', name: trimmed });
  }

  return options;
}

export function formatTagAutocompleteLabel(option: TagAutocompleteOption): string {
  if (option.kind === 'create') {
    return t('popup_tag_create_option', [option.name]);
  }
  return option.tag.name;
}
