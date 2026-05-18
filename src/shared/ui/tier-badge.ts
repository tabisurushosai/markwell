import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { LicenseTier } from '../storage/highlights.js';
import { t } from '../utils/i18n.js';

@customElement('mw-tier-badge')
export class MwTierBadge extends LitElement {
  @property({ reflect: true }) tier: LicenseTier = 'free';

  @property({ attribute: 'trial-remaining' }) trialRemainingLabel = '';

  @property({ type: Boolean, attribute: 'trial-urgent' }) trialUrgent = false;

  static styles = css`
    :host {
      display: inline-flex;
    }

    .badge {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1.15;
      border: 1px solid transparent;
      font-family: inherit;
      background: transparent;
      color: inherit;
    }

    .badge--clickable {
      cursor: pointer;
    }

    .badge--clickable:hover {
      filter: brightness(1.08);
    }

    .badge--clickable:focus-visible {
      outline: 2px solid #ffd34e;
      outline-offset: 2px;
    }

    .badge[data-tier='free'] {
      color: #b0b0b0;
      background: #3a3a3a;
      border-color: #555;
    }

    .badge[data-tier='trial'] {
      color: var(--accent, #ffd34e);
      background: color-mix(in srgb, var(--accent, #ffd34e) 14%, #242424);
      border-color: color-mix(in srgb, var(--accent, #ffd34e) 45%, #555);
    }

    .badge[data-tier='trial'][data-urgent] {
      color: #fff;
      background: #c62828;
      border-color: #b71c1c;
    }

    .badge[data-tier='premium'] {
      color: #3d2f00;
      background: linear-gradient(135deg, #ffe9a8 0%, #ffd34e 45%, #c9a227 100%);
      border-color: #b8941f;
      box-shadow: 0 1px 4px rgba(255, 211, 78, 0.35);
    }

    .days {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0;
    }
  `;

  private get badgeLabel(): string {
    if (this.tier === 'premium') {
      return t('tier_badge_premium');
    }
    if (this.tier === 'trial') {
      return t('tier_badge_trial');
    }
    return t('tier_badge_free');
  }

  private get isClickable(): boolean {
    return this.tier === 'free' || this.tier === 'trial';
  }

  private handleClick(): void {
    if (!this.isClickable) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent('mw-tier-badge-click', { bubbles: true, composed: true }),
    );
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (!this.isClickable) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  }

  override render() {
    const label = this.badgeLabel;
    const showTrialDays = this.tier === 'trial' && this.trialRemainingLabel !== '';

    return html`
      <button
        type="button"
        class="badge ${this.isClickable ? 'badge--clickable' : ''}"
        data-tier=${this.tier}
        ?data-urgent=${this.trialUrgent}
        ?disabled=${!this.isClickable}
        aria-label=${this.isClickable ? `${label} — Premium を購入` : label}
        title=${this.isClickable ? 'Premium を購入' : label}
        @click=${() => {
          this.handleClick();
        }}
        @keydown=${(event: KeyboardEvent) => {
          this.handleKeydown(event);
        }}
      >
        ${showTrialDays
          ? html`
              <span>${label}</span>
              <span class="days">${this.trialRemainingLabel}</span>
            `
          : label}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-tier-badge': MwTierBadge;
  }
}
