import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { applyLicenseKey } from '../shared/license/apply-license-key.js';
import { LicenseRefundedError } from '../shared/license/verify.js';
import { resolveStripePaymentLink } from '../shared/license/config.js';
import { hasUsedTrial, startTrial, TrialAlreadyUsedError } from '../shared/license/start-trial.js';
import {
  formatTrialRemainingLabel,
  getTrialDaysRemaining,
  isTrialUrgent,
} from '../shared/license/trial-countdown.js';
import { getCurrentTier, getLicenseStatus } from '../shared/storage/license.js';
import { toastFrom } from '../shared/components/toast.js';
import { getSettings } from '../shared/storage/settings.js';
import { InvalidLicenseKeyError } from '../shared/license/verify.js';
import { t } from '../shared/utils/i18n.js';
import { optionsAccessibilityStyles } from './styles.js';

type Tier = 'free' | 'trial' | 'premium';

const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  trial: 'Trial',
  premium: 'Premium',
};

@customElement('mw-premium-section')
export class MwPremiumSection extends LitElement {
  @state() private loading = true;

  @state() private currentTier: Tier = 'free';

  @state() private storedLicenseKey = '';

  @state() private licenseKeyDraft = '';

  @state() private applying = false;

  @state() private trialUsed = false;

  @state() private startingTrial = false;

  @state() private trialRemainingLabel = '';

  @state() private trialUrgent = false;

  private paymentLinkUrl = resolveStripePaymentLink('');

  static styles = [...optionsAccessibilityStyles, css`
    :host {
      display: block;
    }

    .status-card {
      margin: 0 0 24px;
      padding: 12px 14px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #242424;
    }

    .status-label {
      margin: 0;
      font-size: 12px;
      color: #888;
    }

    .status-value {
      margin: 4px 0 0;
      font-size: 18px;
      font-weight: 600;
      color: #ffd34e;
    }

    .trial-countdown {
      margin: 6px 0 0;
      font-size: 14px;
      font-weight: 600;
      color: #c9b35c;
    }

    .trial-countdown--urgent {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 10px;
      border-radius: 6px;
      color: #fff;
      background: #c62828;
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

    .purchase-note {
      margin: 0 0 12px;
      padding: 10px 12px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #242424;
      font-size: 12px;
      color: #ccc;
      line-height: 1.5;
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

    .trial-note {
      margin: 8px 0 0;
      font-size: 12px;
      color: #c88;
    }

    .license-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      max-width: 560px;
    }

    .license-input {
      flex: 1 1 240px;
      min-width: 0;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .license-input:focus {
      outline: 2px solid #ffd34e;
      outline-offset: 0;
      border-color: #ffd34e;
    }

  `];

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    const [settings, license, tier] = await Promise.all([
      getSettings(),
      getLicenseStatus(),
      getCurrentTier(),
    ]);
    this.paymentLinkUrl = resolveStripePaymentLink(settings.stripe_payment_link);
    this.currentTier = tier;
    this.trialUsed = await hasUsedTrial();
    this.applyTrialCountdown(tier, license.trial_end);
    this.storedLicenseKey = license.license_key ?? '';
    this.licenseKeyDraft = license.license_key ?? '';
    this.loading = false;
  }

  private applyTrialCountdown(tier: Tier, trialEnd: number | null): void {
    if (tier === 'trial' && trialEnd !== null) {
      const days = getTrialDaysRemaining(trialEnd);
      this.trialRemainingLabel = formatTrialRemainingLabel(days);
      this.trialUrgent = isTrialUrgent(days);
      return;
    }
    this.trialRemainingLabel = '';
    this.trialUrgent = false;
  }

  private handlePurchase(): void {
    void chrome.tabs.create({ url: this.paymentLinkUrl });
  }

  private async handleStartTrial(): Promise<void> {
    if (this.startingTrial || this.trialUsed) {
      return;
    }

    this.startingTrial = true;
    try {
      const next = await startTrial();
      this.trialUsed = true;
      this.currentTier = await getCurrentTier();
      this.applyTrialCountdown('trial', next.trial_end);
      toastFrom(this, t('options_premium_trial_started'), 'success');
    } catch (error) {
      if (error instanceof TrialAlreadyUsedError) {
        this.trialUsed = true;
        toastFrom(this, t('onboarding_trial_once'), 'warning');
      } else {
        toastFrom(this, t('onboarding_trial_failed'), 'error');
      }
    } finally {
      this.startingTrial = false;
    }
  }

  private async handleApplyLicense(): Promise<void> {
    if (this.applying) {
      return;
    }

    this.applying = true;
    try {
      const next = await applyLicenseKey(this.licenseKeyDraft);
      this.storedLicenseKey = next.license_key ?? '';
      this.licenseKeyDraft = this.storedLicenseKey;
      this.currentTier = await getCurrentTier();
      toastFrom(this, t('options_premium_license_applied'), 'success');
    } catch (error) {
      if (error instanceof LicenseRefundedError) {
        this.currentTier = await getCurrentTier();
        toastFrom(this, error.message, 'error');
        return;
      }
      if (error instanceof InvalidLicenseKeyError) {
        toastFrom(this, t('error_license_invalid'), 'error');
        return;
      }
      const message = error instanceof Error ? error.message : t('options_premium_license_apply_failed');
      toastFrom(this, message, 'error');
    } finally {
      this.applying = false;
    }
  }

  render() {
    if (this.loading) {
      return html`<p class="hint">${t('options_premium_loading')}</p>`;
    }

    const canApply = this.licenseKeyDraft.trim() !== '' && !this.applying;

    return html`
      <div class="status-card">
        <p class="status-label">${t('options_premium_current_plan')}</p>
        <p class="status-value">${TIER_LABELS[this.currentTier]}</p>
        ${this.trialRemainingLabel !== ''
          ? html`<p class="trial-countdown ${this.trialUrgent ? 'trial-countdown--urgent' : ''}">
              ${this.trialRemainingLabel}
            </p>`
          : nothing}
      </div>

      <section class="section" aria-labelledby="trial-title">
        <span id="trial-title" class="section-title">${t('options_premium_trial_section')}</span>
        <p class="hint">${t('onboarding_step2_body')}</p>
        <button
          type="button"
          class="btn btn--primary"
          aria-label=${this.startingTrial ? t('onboarding_starting_trial') : t('onboarding_start_trial')}
          ?disabled=${this.trialUsed || this.startingTrial || this.currentTier === 'premium'}
          @click=${() => {
            void this.handleStartTrial();
          }}
        >
          ${this.startingTrial ? t('onboarding_starting_trial') : t('onboarding_start_trial')}
        </button>
        ${this.trialUsed
          ? html`<p class="trial-note">${t('onboarding_trial_once')}</p>`
          : nothing}
      </section>

      <section class="section" aria-labelledby="purchase-title">
        <span id="purchase-title" class="section-title">${t('options_premium_purchase_section')}</span>
        <p class="purchase-note">${t('options_premium_purchase_note')}</p>
        <button
          type="button"
          class="btn btn--primary"
          aria-label=${t('options_premium_purchase_button')}
          @click=${() => { this.handlePurchase(); }}
        >
          ${t('options_premium_purchase_button')}
        </button>
        <p class="hint">${t('options_premium_stripe_hint')}</p>
      </section>

      <section class="section" aria-labelledby="license-key-title">
        <label id="license-key-title" class="section-title" for="license-key-input">${t('options_premium_license_key')}</label>
        <div class="license-row">
          <input
            id="license-key-input"
            class="license-input"
            type="text"
            placeholder="MW-XXXX-XXXX"
            .value=${this.licenseKeyDraft}
            ?disabled=${this.applying}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLInputElement) {
                this.licenseKeyDraft = input.value;
              }
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Enter' && canApply) {
                event.preventDefault();
                void this.handleApplyLicense();
              }
            }}
          />
          <button
            type="button"
            class="btn btn--primary"
            aria-label=${this.applying ? t('options_action_applying') : t('popup_apply')}
            ?disabled=${!canApply}
            @click=${() => {
              void this.handleApplyLicense();
            }}
          >
            ${this.applying ? t('options_action_applying') : t('popup_apply')}
          </button>
        </div>
        ${this.storedLicenseKey !== ''
          ? html`<p class="hint">${t('options_premium_license_stored_hint')}</p>`
          : nothing}
      </section>

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-premium-section': MwPremiumSection;
  }
}
