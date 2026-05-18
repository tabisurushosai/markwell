import { css, html, LitElement, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { AiFeature } from '../license/ai-access.js';
import { navigateToOptionsPremium } from '../license/navigate-options.js';
import { PREMIUM_FEATURE_CATALOG } from '../license/premium-features.js';
import { hasUsedTrial, startTrial, TrialAlreadyUsedError } from '../license/start-trial.js';
import { t } from '../utils/i18n.js';
import { buildUpgradeModalMessage } from './upgrade-modal-helpers.js';

export type UpgradeModalParams = {
  featureName: string;
  limit?: number | null;
  highlightFeature?: AiFeature | null;
  showFeatureList?: boolean;
};

@customElement('mw-upgrade-modal')
export class MwUpgradeModal extends LitElement {
  @property({ type: Boolean }) open = false;

  @property() featureName = '';

  @property({ type: Number }) limit: number | null = null;

  @property({ attribute: false }) highlightFeature: AiFeature | null = null;

  @property({ type: Boolean }) showFeatureList = false;

  @property({ type: Boolean }) trialUsed = true;

  @property({ type: Boolean }) startingTrial = false;

  static styles = css`
    :host {
      all: initial;
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

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #2a2a2a;
      color: #e0e0e0;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #333;
    }

    .btn-trial {
      background: #2e3a52;
      color: #b8d4ff;
      font-weight: 600;
    }

    .btn-trial:hover:not(:disabled) {
      background: #3a4a66;
    }

    .btn-primary {
      background: linear-gradient(135deg, #ffe9a8 0%, #ffd34e 50%, #c9a227 100%);
      color: #3d2f00;
      font-weight: 700;
    }

    .btn-primary:hover:not(:disabled) {
      filter: brightness(1.05);
    }
  `;

  private handleClose(): void {
    this.dispatchEvent(new CustomEvent('mw-close', { bubbles: true, composed: true }));
  }

  private handlePurchase(): void {
    void navigateToOptionsPremium();
    this.handleClose();
  }

  private async handleStartTrial(): Promise<void> {
    if (this.trialUsed || this.startingTrial) {
      return;
    }

    this.startingTrial = true;
    try {
      await startTrial();
      this.trialUsed = true;
      this.dispatchEvent(
        new CustomEvent('mw-trial-started', { bubbles: true, composed: true }),
      );
      this.handleClose();
    } catch (error) {
      if (error instanceof TrialAlreadyUsedError) {
        this.trialUsed = true;
      }
    } finally {
      this.startingTrial = false;
    }
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

  private renderActions() {
    if (!this.trialUsed) {
      return html`
        <button type="button" class="btn-secondary" @click=${() => this.handleClose()}>
          閉じる
        </button>
        <button
          type="button"
          class="btn-trial"
          ?disabled=${this.startingTrial}
          @click=${() => {
            void this.handleStartTrial();
          }}
        >
          ${this.startingTrial ? '開始中…' : t('upgrade_start_trial')}
        </button>
        <button type="button" class="btn-primary" @click=${() => this.handlePurchase()}>
          ${t('upgrade_purchase')}
        </button>
      `;
    }

    return html`
      <button type="button" class="btn-secondary" @click=${() => this.handleClose()}>
        閉じる
      </button>
      <button type="button" class="btn-primary" @click=${() => this.handlePurchase()}>
        $5 で Premium
      </button>
    `;
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    const message = buildUpgradeModalMessage(this.featureName, this.limit);

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
          aria-labelledby="mw-upgrade-modal-title"
          @keydown=${this.handleKeydown}
          @click=${(event: Event) => {
            event.stopPropagation();
          }}
        >
          <h2 id="mw-upgrade-modal-title" class="title">${t('upgrade_modal_title')}</h2>
          <p class="message">${message}</p>
          ${this.showFeatureList
            ? html`<p class="message">
                ${this.trialUsed ? t('upgrade_modal_body_trial_used') : t('upgrade_modal_body_free')}
              </p>`
            : nothing}
          ${this.showFeatureList ? this.renderFeatureList() : nothing}
          <div class="actions">${this.renderActions()}</div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-upgrade-modal': MwUpgradeModal;
  }
}

let activeModal: MwUpgradeModal | null = null;

export function closeUpgradeModal(): void {
  activeModal?.remove();
  activeModal = null;
}

export async function openUpgradeModal(params: UpgradeModalParams): Promise<MwUpgradeModal> {
  closeUpgradeModal();

  const trialUsed = await hasUsedTrial();
  const modal = document.createElement('mw-upgrade-modal');
  modal.featureName = params.featureName;
  modal.limit = params.limit ?? null;
  modal.highlightFeature = params.highlightFeature ?? null;
  modal.showFeatureList = params.showFeatureList ?? params.highlightFeature != null;
  modal.trialUsed = trialUsed;
  modal.open = true;

  modal.addEventListener('mw-close', () => {
    closeUpgradeModal();
  });

  document.body.appendChild(modal);
  activeModal = modal;

  requestAnimationFrame(() => {
    const primary = modal.shadowRoot?.querySelector('.btn-primary, .btn-trial');
    if (primary instanceof HTMLButtonElement) {
      primary.focus();
    }
  });

  return modal;
}
