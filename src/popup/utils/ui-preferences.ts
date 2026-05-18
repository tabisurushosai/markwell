import type { Settings } from '../../shared/types/settings.js';
import { applyDocumentTheme, resolveEffectiveTheme } from './theme.js';

export function applyUiPreferences(
  settings: Pick<Settings, 'font_scale' | 'density' | 'theme'>,
): void {
  applyDocumentTheme(resolveEffectiveTheme(settings.theme));
  document.documentElement.setAttribute('data-density', settings.density);
  document.documentElement.style.fontSize = `${String(Math.round(settings.font_scale * 100))}%`;
}
