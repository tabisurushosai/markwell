import type { ThemePreference } from '../../shared/types/settings.js';

export type ResolvedTheme = 'dark' | 'light';

export function resolveEffectiveTheme(
  preference: ThemePreference,
  prefersLight = prefersColorSchemeLight(),
): ResolvedTheme {
  if (preference === 'dark') {
    return 'dark';
  }
  if (preference === 'light') {
    return 'light';
  }
  return prefersLight ? 'light' : 'dark';
}

function prefersColorSchemeLight(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

const THEME_CYCLE: readonly ThemePreference[] = ['dark', 'light', 'auto'];

export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
}

export function themeToggleIcon(preference: ThemePreference): string {
  switch (preference) {
    case 'dark':
      return '🌙';
    case 'light':
      return '☀️';
    case 'auto':
      return '🌓';
    default:
      return '🌙';
  }
}

export function themeToggleLabel(preference: ThemePreference): string {
  switch (preference) {
    case 'dark':
      return 'ダークモード';
    case 'light':
      return 'ライトモード';
    case 'auto':
      return 'システムに合わせる';
    default:
      return 'ダークモード';
  }
}

export function applyDocumentTheme(resolved: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', resolved);
}
