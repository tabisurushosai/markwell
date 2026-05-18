import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { callGemini, GeminiError } from '../shared/ai/gemini.js';
import { GEMINI_API_KEY_URL, GEMINI_MODEL_OPTIONS } from '../shared/ai/gemini-models.js';
import {
  clearApiKey,
  getApiKey,
  getSettings,
  setApiKey,
  setSettings,
} from '../shared/storage/settings.js';

type TestStatus =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'valid' }
  | { kind: 'error'; message: string };

@customElement('mw-ai-settings')
export class MwAiSettings extends LitElement {
  @state() private loading = true;

  @state() private hasStoredKey = false;

  @state() private apiKeyDraft = '';

  @state() private showApiKey = false;

  @state() private selectedModel = 'gemini-2.0-flash';

  @state() private autoTagOnSave = true;

  @state() private testStatus: TestStatus = { kind: 'idle' };

  @state() private toastMessage = '';

  @state() private toastIsError = false;

  private toastTimer: number | undefined;

  static styles = css`
    :host {
      display: block;
    }

    h2 {
      margin: 32px 0 12px;
      font-size: 16px;
      font-weight: 600;
    }

    h2:first-of-type {
      margin-top: 0;
    }

    .field {
      margin-bottom: 24px;
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

    .hint a {
      color: #ffd34e;
    }

    .privacy-note {
      margin: 0 0 12px;
      padding: 10px 12px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #242424;
      font-size: 12px;
      color: #ccc;
      line-height: 1.5;
    }

    .api-key-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      max-width: 560px;
    }

    .api-key-input-wrap {
      position: relative;
      flex: 1 1 240px;
      min-width: 0;
    }

    .api-key-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 40px 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .api-key-input:focus {
      outline: 2px solid #ffd34e;
      outline-offset: 0;
      border-color: #ffd34e;
    }

    .toggle-visibility {
      position: absolute;
      top: 50%;
      right: 8px;
      transform: translateY(-50%);
      padding: 4px;
      border: none;
      background: transparent;
      color: #aaa;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }

    .toggle-visibility:hover {
      color: #e0e0e0;
    }

    .btn {
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .btn:hover:not(:disabled) {
      border-color: #666;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn--primary {
      border-color: #8a7428;
      color: #ffd34e;
    }

    .btn--danger {
      border-color: #8b3a3a;
      color: #f0a0a0;
    }

    .actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 8px;
    }

    .test-status {
      margin: 8px 0 0;
      font-size: 13px;
    }

    .test-status--valid {
      color: #7dd87d;
    }

    .test-status--error {
      color: #f0a0a0;
    }

    select {
      min-width: 240px;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #e0e0e0;
    }

    .checkbox-row input {
      width: 16px;
      height: 16px;
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
    const storedKey = await getApiKey();
    this.hasStoredKey = storedKey !== null;
    this.selectedModel = settings.ai.model;
    this.autoTagOnSave = settings.ai.auto_tag_on_save;
    this.apiKeyDraft = '';
    this.testStatus = { kind: 'idle' };
    this.loading = false;
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

  private async handleModelChange(event: Event): Promise<void> {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const model = select.value;
    if (model === this.selectedModel) {
      return;
    }
    try {
      const current = await getSettings();
      await setSettings({
        ai: {
          ...current.ai,
          model,
        },
      });
      this.selectedModel = model;
      this.testStatus = { kind: 'idle' };
      this.showToast('モデルを保存しました');
    } catch {
      this.showToast('モデルの保存に失敗しました', true);
    }
  }

  private async handleAutoTagChange(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const auto_tag_on_save = input.checked;
    try {
      const current = await getSettings();
      await setSettings({
        ai: {
          ...current.ai,
          auto_tag_on_save,
        },
      });
      this.autoTagOnSave = auto_tag_on_save;
      this.showToast(auto_tag_on_save ? 'AI 自動タグを有効化しました' : 'AI 自動タグを無効化しました');
    } catch {
      this.showToast('設定の保存に失敗しました', true);
    }
  }

  private resolveApiKeyForRequest(): string | undefined {
    const draft = this.apiKeyDraft.trim();
    if (draft !== '') {
      return draft;
    }
    return undefined;
  }

  private async handleTestKey(): Promise<void> {
    const draft = this.apiKeyDraft.trim();
    if (draft === '' && !this.hasStoredKey) {
      this.testStatus = { kind: 'error', message: 'API キーを入力してください' };
      return;
    }

    this.testStatus = { kind: 'testing' };
    try {
      await callGemini('test', {
        feature: 'translation',
        model: this.selectedModel,
        apiKey: this.resolveApiKeyForRequest(),
      });
      if (draft !== '') {
        await setApiKey(draft);
        this.hasStoredKey = true;
        this.apiKeyDraft = '';
        this.showToast('API キーを保存しました');
      }
      this.testStatus = { kind: 'valid' };
    } catch (error) {
      const message =
        error instanceof GeminiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'キーのテストに失敗しました';
      this.testStatus = { kind: 'error', message };
    }
  }

  private async handleDeleteKey(): Promise<void> {
    const confirmed = window.confirm('保存済みの API キーを削除しますか？');
    if (!confirmed) {
      return;
    }
    try {
      await clearApiKey();
      this.hasStoredKey = false;
      this.apiKeyDraft = '';
      this.testStatus = { kind: 'idle' };
      this.showToast('API キーを削除しました');
    } catch {
      this.showToast('API キーの削除に失敗しました', true);
    }
  }

  private renderTestStatus() {
    if (this.testStatus.kind === 'testing') {
      return html`<p class="test-status">テスト中…</p>`;
    }
    if (this.testStatus.kind === 'valid') {
      return html`<p class="test-status test-status--valid">✓ 有効</p>`;
    }
    if (this.testStatus.kind === 'error') {
      return html`<p class="test-status test-status--error">${this.testStatus.message}</p>`;
    }
    return nothing;
  }

  render() {
    if (this.loading) {
      return html`<p class="loading">AI 設定を読み込み中…</p>`;
    }

    return html`
      <h2>Gemini API</h2>
      <p class="privacy-note">このキーは Markwell サーバには一切送信されません。</p>

      <div class="field">
        <label class="field-label" for="api-key">API キー</label>
        <p class="hint">
          <a href=${GEMINI_API_KEY_URL} target="_blank" rel="noopener noreferrer">
            Google AI Studio で API キーを取得
          </a>
        </p>
        <div class="api-key-row">
          <div class="api-key-input-wrap">
            <input
              id="api-key"
              class="api-key-input"
              type=${this.showApiKey ? 'text' : 'password'}
              autocomplete="off"
              spellcheck="false"
              placeholder=${this.hasStoredKey ? '保存済み（再入力で上書き）' : 'API キーを入力'}
              .value=${this.apiKeyDraft}
              @input=${(event: Event) => {
                const input = event.target;
                if (input instanceof HTMLInputElement) {
                  this.apiKeyDraft = input.value;
                  this.testStatus = { kind: 'idle' };
                }
              }}
            />
            <button
              type="button"
              class="toggle-visibility"
              aria-label=${this.showApiKey ? 'API キーを隠す' : 'API キーを表示'}
              @click=${() => {
                this.showApiKey = !this.showApiKey;
              }}
            >
              ${this.showApiKey ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <div class="actions-row">
          <button
            type="button"
            class="btn btn--primary"
            ?disabled=${this.testStatus.kind === 'testing'}
            @click=${() => {
              void this.handleTestKey();
            }}
          >
            キーをテスト
          </button>
          <button
            type="button"
            class="btn btn--danger"
            ?disabled=${!this.hasStoredKey}
            @click=${() => {
              void this.handleDeleteKey();
            }}
          >
            API キーを削除
          </button>
        </div>
        ${this.renderTestStatus()}
      </div>

      <div class="field">
        <label class="field-label" for="gemini-model">モデル</label>
        <select
          id="gemini-model"
          .value=${this.selectedModel}
          @change=${(event: Event) => {
            void this.handleModelChange(event);
          }}
        >
          ${GEMINI_MODEL_OPTIONS.map(
            (model) => html`
              <option value=${model}>${model}</option>
            `,
          )}
        </select>
        <p class="hint">翻訳・言い換え・合成などの AI 機能で使用する Gemini モデルです。</p>
      </div>

      <div class="field">
        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${this.autoTagOnSave}
            @change=${(event: Event) => {
              void this.handleAutoTagChange(event);
            }}
          />
          AI 自動タグを有効化
        </label>
        <p class="hint">ハイライト保存時に AI がタグ候補を付与します（trial / premium）。</p>
      </div>

      ${this.toastMessage !== ''
        ? html`<p class="toast ${this.toastIsError ? 'toast--error' : ''}">${this.toastMessage}</p>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-ai-settings': MwAiSettings;
  }
}
