import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { t } from '../shared/utils/i18n.js';

@customElement('markwell-note-dialog')
export class MarkwellNoteDialog extends LitElement {
  static override styles = css`
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        sans-serif;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
      padding: 16px;
      box-sizing: border-box;
    }

    .panel {
      all: initial;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: min(420px, 100%);
      max-height: min(70vh, 480px);
      padding: 16px;
      border-radius: 12px;
      background: #1a1a1a;
      color: #e8e8e8;
      border: 1px solid #333;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      box-sizing: border-box;
      font-family: inherit;
    }

    .title {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
    }

    textarea {
      width: 100%;
      min-height: 120px;
      max-height: 40vh;
      resize: vertical;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #444;
      background: #0f0f0f;
      color: #e8e8e8;
      font: inherit;
      font-size: 13px;
      line-height: 1.5;
      box-sizing: border-box;
    }

    textarea:focus {
      outline: 2px solid #7eb6ff;
      outline-offset: 1px;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    button {
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .cancel-btn {
      background: #2a2a2a;
      color: #e0e0e0;
    }

    .cancel-btn:hover {
      background: #333;
    }

    .save-btn {
      background: #7eb6ff;
      color: #0a0a0a;
      font-weight: 600;
    }

    .save-btn:hover {
      background: #9ec8ff;
    }
  `;

  @property({ type: String })
  initialNote = '';

  @property({ attribute: false })
  onSave: ((note: string) => void) | null = null;

  @property({ attribute: false })
  onCancel: (() => void) | null = null;

  @state()
  private draft = '';

  override connectedCallback(): void {
    super.connectedCallback();
    this.draft = this.initialNote;
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    if (changed.has('initialNote') && !changed.has('draft')) {
      this.draft = this.initialNote;
    }
  }

  private handleInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }
    this.draft = target.value;
  }

  private handleSave(): void {
    this.onSave?.(this.draft);
  }

  private handleCancel(): void {
    this.onCancel?.();
  }

  private handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.handleCancel();
    }
  }

  private handlePanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleCancel();
    }
  }

  override render() {
    return html`
      <div
        class="backdrop"
        role="presentation"
        @click=${this.handleBackdropClick}
      >
        <div
          class="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="markwell-note-title"
          @keydown=${this.handlePanelKeydown}
          @click=${(event: Event) => {
            event.stopPropagation();
          }}
        >
          <p id="markwell-note-title" class="title">${t('note_dialog_title')}</p>
          <textarea
            .value=${this.draft}
            placeholder=${t('note_dialog_placeholder')}
            aria-label="Highlight note"
            @input=${this.handleInput}
          ></textarea>
          <div class="actions">
            <button type="button" class="cancel-btn" aria-label=${t('note_dialog_cancel')} @click=${this.handleCancel}>
              ${t('note_dialog_cancel')}
            </button>
            <button type="button" class="save-btn" aria-label=${t('note_dialog_save')} @click=${this.handleSave}>
              ${t('note_dialog_save')}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-note-dialog': MarkwellNoteDialog;
  }
}

let activeDialog: MarkwellNoteDialog | null = null;

export function closeNoteDialog(): void {
  activeDialog?.remove();
  activeDialog = null;
}

export function openNoteDialog(options: {
  initialNote: string;
  onSave: (note: string) => void | Promise<void>;
  onCancel?: () => void;
}): void {
  closeNoteDialog();

  const dialog = document.createElement('markwell-note-dialog');
  dialog.initialNote = options.initialNote;

  dialog.onSave = (note) => {
    void (async () => {
      await options.onSave(note);
      closeNoteDialog();
    })();
  };

  dialog.onCancel = () => {
    options.onCancel?.();
    closeNoteDialog();
  };

  document.body.appendChild(dialog);
  activeDialog = dialog;

  requestAnimationFrame(() => {
    const textarea = dialog.shadowRoot?.querySelector('textarea');
    textarea?.focus();
  });
}
