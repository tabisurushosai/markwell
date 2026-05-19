import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { exportAll, importAll } from '../shared/storage/io.js';
import { deleteAllData } from '../shared/storage/delete-all-data.js';
import {
  buildMarkwellExportFilename,
  downloadJsonFile,
  formatImportResultMessage,
} from './utils/export-download.js';
import { toastFrom } from '../shared/components/toast.js';
import { t } from '../shared/utils/i18n.js';
import { optionsAccessibilityStyles } from './styles.js';

type ImportMode = 'merge' | 'replace';

@customElement('mw-data-section')
export class MwDataSection extends LitElement {
  @state() private exporting = false;

  @state() private importing = false;

  @state() private selectedFileName = '';

  @state() private importPayload: unknown | null = null;

  @state() private importMode: ImportMode = 'merge';


  @state() private showDeleteDialog = false;

  @state() private deleteConfirmText = '';

  @state() private deleting = false;


  static styles = [...optionsAccessibilityStyles, css`
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


    .danger-section {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #333;
    }

    .danger-note {
      margin: 0 0 12px;
      font-size: 12px;
      color: #c88;
      line-height: 1.5;
    }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, 0.55);
      box-sizing: border-box;
    }

    .dialog-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(420px, 100%);
      padding: 20px;
      border: 1px solid #444;
      border-radius: 12px;
      background: #1f1f1f;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      box-sizing: border-box;
    }

    .dialog-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #f0a0a0;
    }

    .dialog-message {
      margin: 0;
      font-size: 13px;
      color: #ccc;
      line-height: 1.6;
    }

    .dialog-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .dialog-input:focus {
      outline: 2px solid #c44;
      outline-offset: 0;
      border-color: #c44;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `];



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
      toastFrom(this, t('options_data_export_downloaded'), 'success');
    } catch {
      toastFrom(this, t('options_data_export_failed'), 'error');
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
      toastFrom(this, t('options_data_json_read_failed'), 'error');
    }
  }

  private handleModeChange(mode: ImportMode): void {
    this.importMode = mode;
  }

  private confirmReplace(): boolean {
    return window.confirm(t('options_data_confirm_replace'));
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
      toastFrom(this, formatImportResultMessage(result), 'success');
      this.resetFileSelection();
    } catch {
      toastFrom(this, t('options_data_import_failed'), 'error');
    } finally {
      this.importing = false;
    }
  }

  private openDeleteDialog(): void {
    this.deleteConfirmText = '';
    this.showDeleteDialog = true;
  }

  private closeDeleteDialog(): void {
    if (this.deleting) {
      return;
    }
    this.showDeleteDialog = false;
    this.deleteConfirmText = '';
  }

  private async handleDeleteAllData(): Promise<void> {
    if (this.deleting || this.deleteConfirmText !== 'DELETE') {
      return;
    }

    this.deleting = true;
    try {
      await deleteAllData();
      this.resetFileSelection();
      this.showDeleteDialog = false;
      this.deleteConfirmText = '';
      toastFrom(this, t('options_data_delete_all_success'), 'success');
    } catch {
      toastFrom(this, t('options_data_delete_failed'), 'error');
    } finally {
      this.deleting = false;
    }
  }

  private renderDeleteDialog() {
    const canConfirm = this.deleteConfirmText === 'DELETE' && !this.deleting;

    return html`
      <div
        class="dialog-backdrop"
        role="presentation"
        @click=${(event: MouseEvent) => {
          if (event.target === event.currentTarget) {
            this.closeDeleteDialog();
          }
        }}
      >
        <div
          class="dialog-panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-all-title"
          @click=${(event: Event) => {
            event.stopPropagation();
          }}
        >
          <h2 id="delete-all-title" class="dialog-title">${t('options_data_delete_all_title')}</h2>
          <p class="dialog-message">${t('confirm_delete_all')}</p>
          <p class="dialog-message"><strong>${t('options_data_license_kept_bold')}</strong></p>
          <p class="dialog-message">${t('options_data_type_delete_hint')}</p>
          <input
            class="dialog-input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="DELETE"
            .value=${this.deleteConfirmText}
            ?disabled=${this.deleting}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLInputElement) {
                this.deleteConfirmText = input.value;
              }
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                this.closeDeleteDialog();
              }
            }}
          />
          <div class="dialog-actions">
            <button
              type="button"
              class="btn"
              aria-label=${t('note_dialog_cancel')}
              ?disabled=${this.deleting}
              @click=${() => {
                this.closeDeleteDialog();
              }}
            >
              ${t('note_dialog_cancel')}
            </button>
            <button
              type="button"
              class="btn btn--danger"
              aria-label=${this.deleting ? t('options_action_deleting') : t('options_action_delete_confirm')}
              ?disabled=${!canConfirm}
              @click=${() => {
                void this.handleDeleteAllData();
              }}
            >
              ${this.deleting ? t('options_action_deleting') : t('options_action_delete_confirm')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    const canImport = this.importPayload !== null && !this.importing;

    return html`
      <section class="section" aria-labelledby="export-title">
        <span id="export-title" class="section-title">${t('options_data_export_title')}</span>
        <p class="hint">${t('options_data_export_hint')}</p>
        <div class="actions">
          <button
            type="button"
            class="btn btn--primary"
            aria-label=${this.exporting ? t('options_data_exporting') : t('options_data_export_button')}
            ?disabled=${this.exporting}
            @click=${() => {
              void this.handleExport();
            }}
          >
            ${this.exporting ? t('options_data_exporting') : t('options_data_export_button')}
          </button>
        </div>
      </section>

      <section class="section" aria-labelledby="import-title">
        <span id="import-title" class="section-title">${t('options_data_import_title')}</span>
        <p class="hint">${t('options_data_import_hint')}</p>
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
            aria-label=${t('options_data_choose_file')}
            ?disabled=${this.importing}
            @click=${() => {
              this.openFilePicker();
            }}
          >
            ${t('options_data_choose_file')}
          </button>
        </div>
        ${this.selectedFileName !== ''
          ? html`<p class="file-name">${t('options_data_file_selected', [this.selectedFileName])}</p>`
          : nothing}
        <div class="mode-row" role="radiogroup" aria-label=${t('options_data_import_mode')}>
          <button
            type="button"
            class="mode-btn ${this.importMode === 'merge' ? 'mode-btn--active' : ''}"
            aria-label=${t('options_data_mode_merge')}
            aria-pressed=${this.importMode === 'merge'}
            @click=${() => {
              this.handleModeChange('merge');
            }}
          >
            ${t('options_data_mode_merge')}
          </button>
          <button
            type="button"
            class="mode-btn ${this.importMode === 'replace' ? 'mode-btn--active' : ''}"
            aria-label=${t('options_data_mode_replace')}
            aria-pressed=${this.importMode === 'replace'}
            @click=${() => {
              this.handleModeChange('replace');
            }}
          >
            ${t('options_data_mode_replace')}
          </button>
        </div>
        <p class="hint">${t('options_data_mode_hint')}</p>
        <div class="import-actions">
          <button
            type="button"
            class="btn ${this.importMode === 'replace' ? 'btn--danger' : 'btn--primary'}"
            aria-label=${this.importing ? t('options_data_importing') : t('options_data_import_button')}
            ?disabled=${!canImport}
            @click=${() => {
              void this.handleImport();
            }}
          >
            ${this.importing ? t('options_data_importing') : t('options_data_import_button')}
          </button>
        </div>
      </section>

      <section class="section danger-section" aria-labelledby="delete-all-title-section">
        <span id="delete-all-title-section" class="section-title">${t('options_data_danger_title')}</span>
        <p class="danger-note">${t('options_data_danger_hint')}</p>
        <div class="actions">
          <button
            type="button"
            class="btn btn--danger"
            aria-label=${t('options_data_delete_all_title')}
            ?disabled=${this.deleting}
            @click=${() => {
              this.openDeleteDialog();
            }}
          >
            ${t('options_data_delete_all_title')}
          </button>
        </div>
      </section>

      ${this.showDeleteDialog ? this.renderDeleteDialog() : nothing}

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-data-section': MwDataSection;
  }
}
