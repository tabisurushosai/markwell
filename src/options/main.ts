import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { TRANSLATE_LANGUAGE_LABELS } from '../shared/ai/translation.js';
import { getSettings, setSettings } from '../shared/storage/settings.js';

@customElement('mw-options')
export class MwOptions extends LitElement {
  @state() private translateTargetLang = 'ja';

  @state() private saved = false;

  static styles = css`
    :host {
      display: block;
      padding: 24px;
      font-family: system-ui, sans-serif;
      color: #e0e0e0;
      background: #1a1a1a;
    }

    h1 {
      margin: 0 0 16px;
      font-size: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #aaa;
    }

    select {
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-size: 14px;
    }

    .hint {
      margin: 8px 0 0;
      font-size: 12px;
      color: #888;
    }

    .status {
      margin-top: 12px;
      font-size: 13px;
      color: #ffd34e;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    const settings = await getSettings();
    this.translateTargetLang = settings.translate_target_lang;
  }

  private async onLangChange(event: Event): Promise<void> {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    this.translateTargetLang = select.value;
    await setSettings({ translate_target_lang: select.value });
    this.saved = true;
    window.setTimeout(() => {
      this.saved = false;
    }, 2000);
  }

  render() {
    return html`
      <h1>Markwell 設定</h1>
      <section>
        <label for="translate-lang">ハイライト翻訳の既定言語</label>
        <select
          id="translate-lang"
          .value=${this.translateTargetLang}
          @change=${(event: Event) => {
            void this.onLangChange(event);
          }}
        >
          ${Object.entries(TRANSLATE_LANGUAGE_LABELS).map(
            ([code, label]) => html`
              <option value=${code}>${label}</option>
            `,
          )}
        </select>
        <p class="hint">popup の「🌐 翻訳」で使用します。API キーが必要です。</p>
        ${this.saved ? html`<p class="status">保存しました</p>` : ''}
      </section>
    `;
  }
}

document.body.appendChild(document.createElement('mw-options'));
