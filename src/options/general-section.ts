import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { TRANSLATE_LANGUAGE_LABELS } from '../shared/ai/translation.js';
import { getSettings, setSettings } from '../shared/storage/settings.js';
import type { HighlightColor } from '../shared/types/highlight.js';
import type { Settings, ThemePreference } from '../shared/types/settings.js';
import { applyUiPreferences } from '../popup/utils/ui-preferences.js';
import {
  clampFontScale,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
} from './utils/settings-form.js';
import './blocked-sites-section.js';
import { toastFrom } from '../shared/components/toast.js';
import { t } from '../shared/utils/i18n.js';
import { optionsAccessibilityStyles } from './styles.js';

const COLOR_OPTIONS: ReadonlyArray<{ id: HighlightColor; hex: string; labelKey: string }> = [
  { id: 'yellow', hex: '#ffd34e', labelKey: 'options_color_yellow' },
  { id: 'green', hex: '#7dd87d', labelKey: 'options_color_green' },
  { id: 'pink', hex: '#ff8ac2', labelKey: 'side_panel_color_pink' },
  { id: 'blue', hex: '#7eb6ff', labelKey: 'options_color_blue' },
  { id: 'orange', hex: '#ffb347', labelKey: 'side_panel_color_orange' },
];

const DENSITY_OPTIONS: ReadonlyArray<{ id: Settings['density']; label: string }> = [
  { id: 'compact', label: 'compact' },
  { id: 'normal', label: 'normal' },
  { id: 'comfortable', label: 'comfortable' },
];

const THEME_OPTIONS: ReadonlyArray<{ id: ThemePreference; label: string }> = [
  { id: 'auto', label: 'auto' },
  { id: 'dark', label: 'dark' },
  { id: 'light', label: 'light' },
];

@customElement('mw-general-settings')
export class MwGeneralSettings extends LitElement {
  @state() private loading = true;

  @state() private defaultColor: HighlightColor = 'yellow';

  @state() private fontScale = 1;

  @state() private density: Settings['density'] = 'normal';

  @state() private theme: ThemePreference = 'dark';

  @state() private translateTargetLang = 'ja';



  static styles = [...optionsAccessibilityStyles, css`
    :host {
      display: block;
    }

    .field {
      margin-bottom: 28px;
    }

    .field-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #e0e0e0;
    }

    .hint {
      margin: 8px 0 0;
      font-size: 12px;
      color: #888;
      line-height: 1.5;
    }

    .color-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .color-btn {
      width: 36px;
      height: 36px;
      padding: 0;
      border: 2px solid #444;
      border-radius: 8px;
      cursor: pointer;
    }

    .color-btn:hover {
      border-color: #888;
    }

    .color-btn--selected {
      border-color: #ffd34e;
      box-shadow: 0 0 0 2px rgba(255, 211, 78, 0.35);
    }

    .slider-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .slider {
      flex: 1 1 200px;
      min-width: 0;
      accent-color: #ffd34e;
    }

    .slider-value {
      min-width: 3ch;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
      color: #ffd34e;
    }

    .segmented {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 4px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #242424;
    }

    .segment-btn {
      padding: 8px 14px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: #aaa;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .segment-btn:hover {
      color: #e0e0e0;
    }

    .segment-btn--active {
      border-color: #8a7428;
      background: #1a1a1a;
      color: #ffd34e;
    }

    select,
    textarea {
      font-family: inherit;
    }

    select {
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-size: 14px;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      min-height: 120px;
      padding: 10px 12px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #242424;
      color: #e0e0e0;
      font-size: 13px;
      line-height: 1.5;
      resize: vertical;
    }

    textarea:focus,
    select:focus {
      outline: 2px solid #ffd34e;
      outline-offset: 0;
      border-color: #ffd34e;
    }

    .loading {
      margin: 0;
      color: #888;
      font-size: 13px;
    }

  `];

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }


  private async load(): Promise<void> {
    this.loading = true;
    const settings = await getSettings();
    this.applyLocalState(settings);
    applyUiPreferences(settings);
    this.loading = false;
  }

  private applyLocalState(settings: Settings): void {
    this.defaultColor = settings.default_color;
    this.fontScale = settings.font_scale;
    this.density = settings.density;
    this.theme = settings.theme;
    this.translateTargetLang = settings.translate_target_lang;
  }

  private async persist(
    patch: Partial<Settings>,
    options: { message?: string; onError?: () => void } = {},
  ): Promise<boolean> {
    try {
      const next = await setSettings(patch);
      this.applyLocalState(next);
      applyUiPreferences(next);
      toastFrom(this, options.message ?? t('toast_saved'), 'success');
      return true;
    } catch (error) {
      options.onError?.();
      toastFrom(
        this,
        error instanceof Error ? error.message : t('options_save_failed'),
        'error',
      );
      return false;
    }
  }

  private async handleDefaultColor(color: HighlightColor): Promise<void> {
    if (color === this.defaultColor) {
      return;
    }
    this.defaultColor = color;
    await this.persist({ default_color: color });
  }

  private async handleFontScaleInput(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const value = clampFontScale(Number(input.value));
    this.fontScale = value;
    await this.persist({ font_scale: value });
  }

  private async handleDensityChange(density: Settings['density']): Promise<void> {
    if (density === this.density) {
      return;
    }
    this.density = density;
    await this.persist({ density });
  }

  private async handleThemeChange(theme: ThemePreference): Promise<void> {
    if (theme === this.theme) {
      return;
    }
    this.theme = theme;
    await this.persist({ theme });
  }

  private async handleTranslateLangChange(event: Event): Promise<void> {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    this.translateTargetLang = select.value;
    await this.persist({ translate_target_lang: select.value });
  }

  render() {
    if (this.loading) {
      return html`<p class="loading">${t('options_general_loading')}</p>`;
    }

    return html`
      <h1>${t('options_section_general')}</h1>
      <p class="hint" style="margin: 0 0 24px;">${t('options_general_autosave_hint')}</p>

      <div class="field">
        <span class="field-label">${t('option_default_color')}</span>
        <div class="color-row" role="radiogroup" aria-label=${t('option_default_color')}>
          ${COLOR_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="color-btn ${this.defaultColor === option.id ? 'color-btn--selected' : ''}"
                style="background: ${option.hex}"
                title=${t(option.labelKey)}
                aria-label=${t(option.labelKey)}
                aria-pressed=${this.defaultColor === option.id}
                @click=${() => {
                  void this.handleDefaultColor(option.id);
                }}
              ></button>
            `,
          )}
        </div>
        <p class="hint">${t('options_general_default_color_hint')}</p>
      </div>

      <div class="field">
        <label class="field-label" for="font-scale">${t('option_font_scale')}</label>
        <div class="slider-row">
          <input
            id="font-scale"
            class="slider"
            type="range"
            min=${String(FONT_SCALE_MIN)}
            max=${String(FONT_SCALE_MAX)}
            step="0.05"
            .value=${String(this.fontScale)}
            @input=${(event: Event) => {
              void this.handleFontScaleInput(event);
            }}
          />
          <span class="slider-value">${this.fontScale.toFixed(2)}</span>
        </div>
        <p class="hint">${t('options_general_font_scale_hint', [String(FONT_SCALE_MIN), String(FONT_SCALE_MAX)])}</p>
      </div>

      <div class="field">
        <span class="field-label">${t('option_density')}</span>
        <div class="segmented" role="radiogroup" aria-label=${t('option_density')}>
          ${DENSITY_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="segment-btn ${this.density === option.id ? 'segment-btn--active' : ''}"
                aria-label=${option.label}
                aria-pressed=${this.density === option.id}
                @click=${() => {
                  void this.handleDensityChange(option.id);
                }}
              >
                ${option.label}
              </button>
            `,
          )}
        </div>
      </div>

      <div class="field">
        <span class="field-label">${t('option_theme')}</span>
        <div class="segmented" role="radiogroup" aria-label=${t('option_theme')}>
          ${THEME_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="segment-btn ${this.theme === option.id ? 'segment-btn--active' : ''}"
                aria-label=${option.label}
                aria-pressed=${this.theme === option.id}
                @click=${() => {
                  void this.handleThemeChange(option.id);
                }}
              >
                ${option.label}
              </button>
            `,
          )}
        </div>
        <p class="hint">${t('options_general_theme_auto_hint')}</p>
      </div>

      <div class="field">
        <label class="field-label" for="translate-lang">${t('options_general_translate_lang')}</label>
        <select
          id="translate-lang"
          .value=${this.translateTargetLang}
          @change=${(event: Event) => {
            void this.handleTranslateLangChange(event);
          }}
        >
          ${Object.entries(TRANSLATE_LANGUAGE_LABELS).map(
            ([code, label]) => html`
              <option value=${code}>${label}</option>
            `,
          )}
        </select>
        <p class="hint">${t('options_general_translate_hint')}</p>
      </div>

      <mw-blocked-sites></mw-blocked-sites>

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-general-settings': MwGeneralSettings;
  }
}
