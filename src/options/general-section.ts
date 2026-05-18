import { LitElement, css, html, nothing } from 'lit';
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

const COLOR_OPTIONS: ReadonlyArray<{ id: HighlightColor; hex: string; label: string }> = [
  { id: 'yellow', hex: '#ffd34e', label: 'イエロー' },
  { id: 'green', hex: '#7dd87d', label: 'グリーン' },
  { id: 'pink', hex: '#ff8ac2', label: 'ピンク' },
  { id: 'blue', hex: '#7eb6ff', label: 'ブルー' },
  { id: 'orange', hex: '#ffb347', label: 'オレンジ' },
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

  @state() private toastMessage = '';

  @state() private toastIsError = false;

  private toastTimer: number | undefined;

  static styles = css`
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

    .toast {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 100;
      margin: 0;
      padding: 10px 16px;
      border-radius: 8px;
      background: #2e2e2e;
      border: 1px solid #555;
      color: #ffd34e;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .toast--error {
      color: #f0a0a0;
      border-color: #8b3a3a;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.toastTimer !== undefined) {
      window.clearTimeout(this.toastTimer);
    }
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

  private showToast(message: string, isError = false): void {
    this.toastMessage = message;
    this.toastIsError = isError;
    if (this.toastTimer !== undefined) {
      window.clearTimeout(this.toastTimer);
    }
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = '';
      this.toastIsError = false;
    }, 2200);
  }

  private async persist(
    patch: Partial<Settings>,
    options: { message?: string; onError?: () => void } = {},
  ): Promise<boolean> {
    try {
      const next = await setSettings(patch);
      this.applyLocalState(next);
      applyUiPreferences(next);
      this.showToast(options.message ?? '保存しました');
      return true;
    } catch (error) {
      options.onError?.();
      this.showToast(error instanceof Error ? error.message : '保存に失敗しました', true);
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
      return html`<p class="loading">設定を読み込み中…</p>`;
    }

    return html`
      <h1>一般</h1>
      <p class="hint" style="margin: 0 0 24px;">変更は自動的に保存されます。</p>

      <div class="field">
        <span class="field-label">既定色</span>
        <div class="color-row" role="radiogroup" aria-label="既定のハイライト色">
          ${COLOR_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="color-btn ${this.defaultColor === option.id ? 'color-btn--selected' : ''}"
                style="background: ${option.hex}"
                title=${option.label}
                aria-label=${option.label}
                aria-pressed=${this.defaultColor === option.id}
                @click=${() => {
                  void this.handleDefaultColor(option.id);
                }}
              ></button>
            `,
          )}
        </div>
        <p class="hint">新規ハイライトの初期色です。</p>
      </div>

      <div class="field">
        <label class="field-label" for="font-scale">フォントスケール</label>
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
        <p class="hint">${String(FONT_SCALE_MIN)} 〜 ${String(FONT_SCALE_MAX)} の範囲で UI の文字サイズを調整します。</p>
      </div>

      <div class="field">
        <span class="field-label">密度</span>
        <div class="segmented" role="radiogroup" aria-label="UI 密度">
          ${DENSITY_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="segment-btn ${this.density === option.id ? 'segment-btn--active' : ''}"
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
        <span class="field-label">テーマ</span>
        <div class="segmented" role="radiogroup" aria-label="テーマ">
          ${THEME_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="segment-btn ${this.theme === option.id ? 'segment-btn--active' : ''}"
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
        <p class="hint">auto は OS の外観設定に合わせます。</p>
      </div>

      <div class="field">
        <label class="field-label" for="translate-lang">ハイライト翻訳の既定言語</label>
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
        <p class="hint">popup の「🌐 翻訳」で使用します。API キーが必要です。</p>
      </div>

      <mw-blocked-sites></mw-blocked-sites>

      ${this.toastMessage !== ''
        ? html`<p class="toast ${this.toastIsError ? 'toast--error' : ''}" role="status">${this.toastMessage}</p>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-general-settings': MwGeneralSettings;
  }
}
