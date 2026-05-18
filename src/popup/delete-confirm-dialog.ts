import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('markwell-delete-confirm-dialog')
export class MarkwellDeleteConfirmDialog extends LitElement {
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
      gap: 16px;
      width: min(360px, 100%);
      padding: 16px;
      border-radius: 12px;
      background: #1a1a1a;
      color: #e8e8e8;
      border: 1px solid #333;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      box-sizing: border-box;
      font-family: inherit;
    }

    .message {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
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

    .confirm-btn {
      background: #e85d5d;
      color: #fff;
      font-weight: 600;
    }

    .confirm-btn:hover {
      background: #f07070;
    }
  `;

  @property()
  message = 'このハイライトを削除しますか？この操作は取り消せません。';

  @property({ attribute: false })
  onConfirm: (() => void) | null = null;

  @property({ attribute: false })
  onCancel: (() => void) | null = null;

  private handleConfirm(): void {
    this.onConfirm?.();
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
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="markwell-popup-delete-title"
          @keydown=${this.handlePanelKeydown}
          @click=${(event: Event) => {
            event.stopPropagation();
          }}
        >
          <p id="markwell-popup-delete-title" class="message">${this.message}</p>
          <div class="actions">
            <button type="button" class="cancel-btn" aria-label="キャンセル" @click=${this.handleCancel}>
              キャンセル
            </button>
            <button type="button" class="confirm-btn" aria-label="削除" @click=${this.handleConfirm}>
              削除
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-delete-confirm-dialog': MarkwellDeleteConfirmDialog;
  }
}

let activeDialog: MarkwellDeleteConfirmDialog | null = null;

export function closeDeleteConfirmDialog(): void {
  activeDialog?.remove();
  activeDialog = null;
}

export function openDeleteConfirmDialog(options: {
  message?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}): void {
  closeDeleteConfirmDialog();

  const dialog = document.createElement('markwell-delete-confirm-dialog');
  if (options.message !== undefined) {
    dialog.message = options.message;
  }

  dialog.onConfirm = () => {
    void (async () => {
      await options.onConfirm();
      closeDeleteConfirmDialog();
    })();
  };

  dialog.onCancel = () => {
    options.onCancel?.();
    closeDeleteConfirmDialog();
  };

  document.body.appendChild(dialog);
  activeDialog = dialog;

  requestAnimationFrame(() => {
    const confirmBtn = dialog.shadowRoot?.querySelector('.confirm-btn');
    if (confirmBtn instanceof HTMLButtonElement) {
      confirmBtn.focus();
    }
  });
}
