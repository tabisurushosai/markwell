import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { AiFeature } from '../license/ai-access.js';
import { navigateToOptionsPremium } from '../license/navigate-options.js';
import {
  findPremiumCatalogItem,
  PREMIUM_FEATURE_CATALOG,
} from '../license/premium-features.js';

export type PremiumDialogMode = 'purchase' | 'unlock';

@customElement('mw-premium-dialog')
export class MwPremiumDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @property() mode: PremiumDialogMode = 'unlock';

  @property({ attribute: false }) highlightFeature: AiFeature | null = null;

  static styles = css`
    :host {
      font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        sans-serif;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.45);
    }

    .panel {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: min(400px, 100%);
      max-height: min(80vh, 520px);
      padding: 18px 20px;
      border-radius: 12px;
      background: #1a1a1a;
      color: #e8e8e8;
      border: 1px solid #333;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      box-sizing: border-box;
      overflow: auto;
    }

    .title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .message {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #ccc;
    }

    .feature-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feature-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      border-radius: 8px;
      background: #242424;
      border: 1px solid #333;
      font-size: 13px;
    }

    .feature-item--highlight {
      border-color: #8a7428;
      background: color-mix(in srgb, #ffd34e 10%, #242424);
    }

    .feature-label {
      font-weight: 500;
    }

    .feature-tier {
      flex-shrink: 0;
      font-size: 11px;
      color: #aaa;
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

    .btn-secondary {
      background: #2a2a2a;
      color: #e0e0e0;
    }

    .btn-secondary:hover {
      background: #333;
    }

    .btn-primary {
      background: linear-gradient(135deg, #ffe9a8 0%, #ffd34e 50%, #c9a227 100%);
      color: #3d2f00;
      font-weight: 700;
    }

    .btn-primary:hover {
      filter: brightness(1.05);
    }
  `;

  private handleClose(): void {
    this.dispatchEvent(new CustomEvent('mw-close', { bubbles: true, composed: true }));
  }

  private handleUpgrade(): void {
    void navigateToOptionsPremium();
    this.handleClose();
  }

  private handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.handleClose();
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleClose();
    }
  }

  private renderFeatureList() {
    return html`
      <ul class="feature-list">
        ${PREMIUM_FEATURE_CATALOG.map((item) => {
          const highlighted =
            item.feature !== undefined && item.feature === this.highlightFeature;
          return html`
            <li class="feature-item ${highlighted ? 'feature-item--highlight' : ''}">
              <span class="feature-label">${item.label}</span>
              <span class="feature-tier">${item.tierNote}</span>
            </li>
          `;
        })}
      </ul>
    `;
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    const highlighted = this.highlightFeature
      ? findPremiumCatalogItem(this.highlightFeature)
      : undefined;

    const title = this.mode === 'purchase' ? 'Premium 購入' : 'Premium で解放';
    const message =
      this.mode === 'purchase'
        ? 'Premium で上限拡大と AI 機能のフル利用ができます。'
        : highlighted !== undefined
          ? `「${highlighted.label}」を含む Premium 機能を利用できます。`
          : '以下の機能を Premium で利用できます。';

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
          aria-labelledby="mw-premium-dialog-title"
          @keydown=${this.handleKeydown}
          @click=${(event: Event) => {
            event.stopPropagation();
          }}
        >
          <h2 id="mw-premium-dialog-title" class="title">${title}</h2>
          <p class="message">${message}</p>
          ${this.mode === 'unlock' ? this.renderFeatureList() : nothing}
          <div class="actions">
            <button type="button" class="btn-secondary" @click=${() => this.handleClose()}>
              閉じる
            </button>
            <button type="button" class="btn-primary" @click=${() => this.handleUpgrade()}>
              $5 で Premium に
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-premium-dialog': MwPremiumDialog;
  }
}
