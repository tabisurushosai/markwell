import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('markwell-tier-limit-dialog')
export class MarkwellTierLimitDialog extends LitElement {
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
      width: min(380px, 100%);
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
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }

    .message {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: #ccc;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;
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

    .primary-btn {
      background: #8a7428;
      color: #ffd34e;
      font-weight: 600;
    }

    .primary-btn:hover {
      background: #9a8440;
    }
  `;

  @property({ attribute: false })
  onClose: (() => void) | null = null;

  @property({ attribute: false })
  onUpgrade: (() => void) | null = null;

  private handleClose(): void {
    this.onClose?.();
  }

  private handleUpgrade(): void {
    this.onUpgrade?.();
  }

  private handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.handleClose();
    }
  }

  private handlePanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleClose();
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
          aria-labelledby="markwell-tier-limit-title"
          @keydown=${this.handlePanelKeydown}
          @click=${(event: Event) => {
            event.stopPropagation();
          }}
        >
          <h2 id="markwell-tier-limit-title" class="title">ハイライト上限</h2>
          <p class="message">上限に達しました ($5 で Premium に)</p>
          <div class="actions">
            <button type="button" class="cancel-btn" @click=${this.handleClose}>閉じる</button>
            <button type="button" class="primary-btn" @click=${this.handleUpgrade}>
              Premium を見る
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-tier-limit-dialog': MarkwellTierLimitDialog;
  }
}

let activeDialog: MarkwellTierLimitDialog | null = null;

export function closeTierLimitDialog(): void {
  activeDialog?.remove();
  activeDialog = null;
}

export function openTierLimitDialog(): void {
  closeTierLimitDialog();

  const dialog = document.createElement('markwell-tier-limit-dialog');

  dialog.onClose = () => {
    closeTierLimitDialog();
  };

  dialog.onUpgrade = () => {
    void chrome.runtime.openOptionsPage();
    closeTierLimitDialog();
  };

  document.body.appendChild(dialog);
  activeDialog = dialog;

  requestAnimationFrame(() => {
    const primaryBtn = dialog.shadowRoot?.querySelector('.primary-btn');
    if (primaryBtn instanceof HTMLButtonElement) {
      primaryBtn.focus();
    }
  });
}
