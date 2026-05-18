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
import { getSettings } from '../shared/storage/settings.js';

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

  @state() private toastMessage = '';

  @state() private toastIsError = false;

  private paymentLinkUrl = resolveStripePaymentLink('');

  private toastTimer: number | undefined;

  static styles = css`
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
      this.showToast('7 日間の Premium トライアルを開始しました');
    } catch (error) {
      if (error instanceof TrialAlreadyUsedError) {
        this.trialUsed = true;
        this.showToast('トライアルは 1 回のみ', true);
      } else {
        this.showToast('トライアルの開始に失敗しました', true);
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
      this.showToast('ライセンスキーを適用しました。Premium が有効になりました');
    } catch (error) {
      if (error instanceof LicenseRefundedError) {
        this.currentTier = await getCurrentTier();
        this.showToast(error.message, true);
        return;
      }
      const message = error instanceof Error ? error.message : 'ライセンスキーの適用に失敗しました';
      this.showToast(message, true);
    } finally {
      this.applying = false;
    }
  }

  render() {
    if (this.loading) {
      return html`<p class="hint">Premium 設定を読み込み中…</p>`;
    }

    const canApply = this.licenseKeyDraft.trim() !== '' && !this.applying;

    return html`
      <div class="status-card">
        <p class="status-label">現在のプラン</p>
        <p class="status-value">${TIER_LABELS[this.currentTier]}</p>
        ${this.trialRemainingLabel !== ''
          ? html`<p class="trial-countdown ${this.trialUrgent ? 'trial-countdown--urgent' : ''}">
              ${this.trialRemainingLabel}
            </p>`
          : nothing}
      </div>

      <section class="section" aria-labelledby="trial-title">
        <span id="trial-title" class="section-title">Premium トライアル</span>
        <p class="hint">7 日間、Premium 機能を無料でお試しいただけます。メール登録は不要です。</p>
        <button
          type="button"
          class="btn btn--primary"
          ?disabled=${this.trialUsed || this.startingTrial || this.currentTier === 'premium'}
          @click=${() => {
            void this.handleStartTrial();
          }}
        >
          ${this.startingTrial ? '開始中…' : '無料で 7 日間 Premium を試す'}
        </button>
        ${this.trialUsed
          ? html`<p class="trial-note">トライアルは 1 回のみ</p>`
          : nothing}
      </section>

      <section class="section" aria-labelledby="purchase-title">
        <span id="purchase-title" class="section-title">Premium を購入</span>
        <p class="purchase-note">
          決済完了後、メールにライセンスキーが届きます。それをここに貼り付けてください。
        </p>
        <button type="button" class="btn btn--primary" @click=${() => this.handlePurchase()}>
          $5 USD で Premium 購入
        </button>
        <p class="hint">Stripe の決済ページが新しいタブで開きます。</p>
      </section>

      <section class="section" aria-labelledby="license-key-title">
        <label id="license-key-title" class="section-title" for="license-key-input">ライセンスキー</label>
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
            ?disabled=${!canApply}
            @click=${() => {
              void this.handleApplyLicense();
            }}
          >
            ${this.applying ? '適用中…' : '適用'}
          </button>
        </div>
        ${this.storedLicenseKey !== ''
          ? html`<p class="hint">保存済みのライセンスキーがあります。</p>`
          : nothing}
      </section>

      ${this.toastMessage !== ''
        ? html`<p class="toast ${this.toastIsError ? 'toast--error' : ''}" role="status">${this.toastMessage}</p>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-premium-section': MwPremiumSection;
  }
}
