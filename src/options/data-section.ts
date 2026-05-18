import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { exportAll, importAll } from '../shared/storage/io.js';
import {
  buildMarkwellExportFilename,
  downloadJsonFile,
  formatImportResultMessage,
} from './utils/export-download.js';

type ImportMode = 'merge' | 'replace';

@customElement('mw-data-section')
export class MwDataSection extends LitElement {
  @state() private exporting = false;

  @state() private importing = false;

  @state() private selectedFileName = '';

  @state() private importPayload: unknown | null = null;

  @state() private importMode: ImportMode = 'merge';

  @state() private toastMessage = '';

  @state() private toastIsError = false;

  private toastTimer: number | undefined;

  static styles = css`
    :host {
      display: block;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
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

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
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

    .file-name {
      margin: 8px 0 0;
      font-size: 13px;
      color: #ccc;
    }

    .mode-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .mode-btn {
      padding: 8px 14px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #aaa;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .mode-btn:hover {
      color: #e0e0e0;
    }

    .mode-btn--active {
      border-color: #8a7428;
      color: #ffd34e;
    }

    .import-actions {
      margin-top: 12px;
    }

    .hidden-input {
      display: none;
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

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.toastTimer !== undefined) {
      window.clearTimeout(this.toastTimer);
    }
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
    }, 3200);
  }

  private resetFileSelection(): void {
    const input = this.renderRoot.querySelector<HTMLInputElement>('#import-file');
    if (input !== null) {
      input.value = '';
    }
    this.selectedFileName = '';
    this.importPayload = null;
  }

  private async handleExport(): Promise<void> {
    if (this.exporting) {
      return;
    }

    this.exporting = true;
    try {
      const payload = await exportAll();
      downloadJsonFile(payload, buildMarkwellExportFilename());
      this.showToast('エクスポートをダウンロードしました');
    } catch {
      this.showToast('エクスポートに失敗しました', true);
    } finally {
      this.exporting = false;
    }
  }

  private openFilePicker(): void {
    this.renderRoot.querySelector<HTMLInputElement>('#import-file')?.click();
  }

  private async handleFileSelected(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }

    try {
      const text = await file.text();
      this.importPayload = JSON.parse(text) as unknown;
      this.selectedFileName = file.name;
    } catch {
      this.resetFileSelection();
      this.showToast('JSON ファイルの読み込みに失敗しました', true);
    }
  }

  private handleModeChange(mode: ImportMode): void {
    this.importMode = mode;
  }

  private confirmReplace(): boolean {
    return window.confirm(
      '既存のハイライト・タグ・プロジェクト・合成をすべて削除し、インポートしたデータで置き換えます。この操作は取り消せません。続行しますか？',
    );
  }

  private async handleImport(): Promise<void> {
    if (this.importing || this.importPayload === null) {
      return;
    }
    if (this.importMode === 'replace' && !this.confirmReplace()) {
      return;
    }

    this.importing = true;
    try {
      const result = await importAll(this.importPayload, this.importMode);
      this.showToast(formatImportResultMessage(result));
      this.resetFileSelection();
    } catch {
      this.showToast('インポートに失敗しました。データは変更されていません。', true);
    } finally {
      this.importing = false;
    }
  }

  render() {
    const canImport = this.importPayload !== null && !this.importing;

    return html`
      <section class="section" aria-labelledby="export-title">
        <span id="export-title" class="section-title">エクスポート</span>
        <p class="hint">
          ハイライト・タグ・プロジェクト・合成を JSON ファイルに保存します。設定や API キーは含まれません。
        </p>
        <div class="actions">
          <button
            type="button"
            class="btn btn--primary"
            ?disabled=${this.exporting}
            @click=${() => {
              void this.handleExport();
            }}
          >
            ${this.exporting ? 'エクスポート中…' : 'エクスポート'}
          </button>
        </div>
      </section>

      <section class="section" aria-labelledby="import-title">
        <span id="import-title" class="section-title">インポート</span>
        <p class="hint">JSON ファイルを読み込み、既存データにマージするか、すべて置き換えます。</p>
        <input
          id="import-file"
          class="hidden-input"
          type="file"
          accept=".json,application/json"
          @change=${(event: Event) => {
            void this.handleFileSelected(event);
          }}
        />
        <div class="actions">
          <button
            type="button"
            class="btn"
            ?disabled=${this.importing}
            @click=${() => {
              this.openFilePicker();
            }}
          >
            ファイルを選択
          </button>
        </div>
        ${this.selectedFileName !== ''
          ? html`<p class="file-name">選択中: ${this.selectedFileName}</p>`
          : nothing}
        <div class="mode-row" role="radiogroup" aria-label="インポートモード">
          <button
            type="button"
            class="mode-btn ${this.importMode === 'merge' ? 'mode-btn--active' : ''}"
            aria-pressed=${this.importMode === 'merge'}
            @click=${() => {
              this.handleModeChange('merge');
            }}
          >
            マージ
          </button>
          <button
            type="button"
            class="mode-btn ${this.importMode === 'replace' ? 'mode-btn--active' : ''}"
            aria-pressed=${this.importMode === 'replace'}
            @click=${() => {
              this.handleModeChange('replace');
            }}
          >
            置換
          </button>
        </div>
        <p class="hint">
          マージは同じ ID のデータを上書きします。置換は既存データをすべて削除してからインポートします。
        </p>
        <div class="import-actions">
          <button
            type="button"
            class="btn ${this.importMode === 'replace' ? 'btn--danger' : 'btn--primary'}"
            ?disabled=${!canImport}
            @click=${() => {
              void this.handleImport();
            }}
          >
            ${this.importing ? 'インポート中…' : 'インポート'}
          </button>
        </div>
      </section>

      ${this.toastMessage !== ''
        ? html`<p class="toast ${this.toastIsError ? 'toast--error' : ''}" role="status">${this.toastMessage}</p>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-data-section': MwDataSection;
  }
}
