import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { estimateTokenCostUsd, formatUsdEstimate, GEMINI_FLASH_PRICING } from '../shared/ai/pricing.js';
import { consumeOptionsSectionRequest } from '../shared/license/navigate-options.js';
import {
  formatTrialRemainingLabel,
  getTrialDaysRemaining,
  isTrialUrgent,
} from '../shared/license/trial-countdown.js';
import type { LicenseTier } from '../shared/storage/highlights.js';
import { resolveLicenseRevokedBanner } from '../shared/license/license-revoked-banner.js';
import { getCurrentTier, getLicenseStatus } from '../shared/storage/license.js';
import '../shared/ui/tier-badge.js';
import '../shared/components/toast.js';
import { toastFrom } from '../shared/components/toast.js';
import '../shared/components/upgrade-modal.js';
import type { UpgradeModalHostState } from '../shared/components/upgrade-modal-host.js';
import {
  buildUpgradeModalHostState,
  CLOSED_UPGRADE_MODAL_STATE,
} from '../shared/components/upgrade-modal-host.js';
import {
  AI_USAGE_FEATURES,
  getAiUsageFeatureLabel,
  clearMonthlyUsage,
  currentUsageMonth,
  getMonthlyUsage,
  type MonthlyUsageRecord,
} from '../shared/ai/usage.js';

import './general-section.js';
import './ai-section.js';
import './data-section.js';
import './about-section.js';
import './premium-section.js';
import './tag-manager.js';
import './project-manager.js';
import { t } from '../shared/utils/i18n.js';
import { optionsAccessibilityStyles } from './styles.js';

type OptionsSection = 'general' | 'ai' | 'tags' | 'projects' | 'premium' | 'data' | 'about';

const SECTIONS: ReadonlyArray<{ id: OptionsSection; labelKey: string }> = [
  { id: 'general', labelKey: 'options_section_general' },
  { id: 'ai', labelKey: 'options_section_ai' },
  { id: 'tags', labelKey: 'options_section_tags' },
  { id: 'projects', labelKey: 'options_section_projects' },
  { id: 'premium', labelKey: 'options_section_premium' },
  { id: 'data', labelKey: 'options_section_data' },
  { id: 'about', labelKey: 'options_section_about' },
];

function formatTokenCount(value: number): string {
  return value.toLocaleString('ja-JP');
}

function formatUsageMonthLabel(usageMonth: string): string {
  const [year, month] = usageMonth.split('-');
  return t('options_usage_month_year', [year, month ?? '']);
}

@customElement('mw-options')
export class MwOptions extends LitElement {
  @state() private activeSection: OptionsSection = 'general';

  @state() private usageMonth = currentUsageMonth();

  @state() private usage: MonthlyUsageRecord | null = null;

  @state() private usageLoading = true;

  @state() private licenseTier: LicenseTier = 'free';

  @state() private trialRemainingLabel = '';

  @state() private trialUrgent = false;

  @state() private licenseRevokedBanner: string | null = null;

  @state() private upgradeModal: UpgradeModalHostState = { ...CLOSED_UPGRADE_MODAL_STATE };

  static styles = [...optionsAccessibilityStyles, css`
    :host {
      display: block;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      color: #e0e0e0;
      background: #1a1a1a;
    }

    :host-context(html[data-theme='light']) {
      color: #18181b;
      background: #f4f4f5;
    }

    .shell {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      flex-shrink: 0;
      width: 220px;
      padding: 24px 0;
      border-right: 1px solid #333;
      background: #141414;
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin: 0 0 20px;
      padding: 0 20px;
    }

    .brand {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #ffd34e;
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-btn {
      display: block;
      width: 100%;
      padding: 10px 20px;
      border: none;
      border-left: 3px solid transparent;
      background: transparent;
      color: #aaa;
      font-family: inherit;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
    }

    .nav-btn:hover {
      color: #e0e0e0;
      background: #1f1f1f;
    }

    .nav-btn--active {
      border-left-color: #ffd34e;
      color: #ffd34e;
      background: #242424;
    }

    .main {
      flex: 1;
      min-width: 0;
      padding: 32px 40px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 22px;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 16px;
    }

    .section-lead {
      margin: 0 0 24px;
      font-size: 13px;
      color: #888;
      line-height: 1.5;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #aaa;
    }

    select,
    button {
      font-family: inherit;
    }

    select {
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-size: 14px;
    }

    .hint {
      margin: 8px 0 0;
      font-size: 12px;
      color: #888;
      line-height: 1.5;
    }

    .status {
      margin-top: 12px;
      font-size: 13px;
      color: #ffd34e;
    }

    .placeholder {
      margin: 0;
      padding: 16px;
      border: 1px dashed #444;
      border-radius: 8px;
      color: #888;
      font-size: 13px;
      line-height: 1.6;
    }

    .usage-summary {
      display: grid;
      gap: 8px;
      margin: 0 0 16px;
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #242424;
    }

    .usage-summary p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .usage-summary .cost {
      font-size: 18px;
      font-weight: 600;
      color: #ffd34e;
    }

    .usage-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .usage-table th,
    .usage-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #333;
      text-align: left;
    }

    .usage-table th {
      color: #aaa;
      font-weight: 600;
    }

    .usage-table td:last-child,
    .usage-table th:last-child {
      text-align: right;
    }

    .usage-empty {
      margin: 0;
      padding: 12px;
      border: 1px dashed #444;
      border-radius: 8px;
      color: #888;
      font-size: 13px;
    }

    .usage-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .btn {
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-size: 13px;
      cursor: pointer;
    }

    .btn:hover {
      border-color: #666;
    }

    .btn--danger {
      border-color: #8b3a3a;
      color: #f0a0a0;
    }

    .btn--danger:hover {
      border-color: #c44;
    }

    .usage-heading {
      margin: 32px 0 12px;
      font-size: 16px;
      font-weight: 600;
    }

    .license-revoked-banner {
      margin: 0 0 20px;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #8b3a3a;
      background: #3a1f1f;
      color: #f0c0c0;
      font-size: 13px;
      line-height: 1.5;
    }

    :host-context(html[data-theme='light']) .license-revoked-banner {
      border-color: #c62828;
      background: #ffebee;
      color: #7f1d1d;
    }
  `];

  connectedCallback(): void {
    super.connectedCallback();
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const section = await consumeOptionsSectionRequest();
    if (section === 'premium') {
      this.activeSection = 'premium';
    }
    await this.refreshLicenseTier();
    void this.loadUsage();
  }

  private async refreshLicenseTier(): Promise<void> {
    const [tier, license] = await Promise.all([getCurrentTier(), getLicenseStatus()]);
    this.licenseTier = tier;
    this.licenseRevokedBanner = resolveLicenseRevokedBanner(license);
    if (tier === 'trial' && license.trial_end !== null) {
      const days = getTrialDaysRemaining(license.trial_end);
      this.trialRemainingLabel = formatTrialRemainingLabel(days);
      this.trialUrgent = isTrialUrgent(days);
    } else {
      this.trialRemainingLabel = '';
      this.trialUrgent = false;
    }
  }

  private async openPurchaseModal(): Promise<void> {
    this.upgradeModal = await buildUpgradeModalHostState({ showFeatureList: true });
  }

  private closeUpgradeModal(): void {
    this.upgradeModal = { ...CLOSED_UPGRADE_MODAL_STATE };
  }

  private readonly onTrialStarted = async (): Promise<void> => {
    await this.refreshLicenseTier();
    this.closeUpgradeModal();
  };

  private async loadUsage(): Promise<void> {
    this.usageLoading = true;
    this.usageMonth = currentUsageMonth();
    this.usage = await getMonthlyUsage(this.usageMonth);
    this.usageLoading = false;
  }

  private selectSection(section: OptionsSection): void {
    this.activeSection = section;
  }

  private async handleResetUsage(): Promise<void> {
    const monthLabel = formatUsageMonthLabel(this.usageMonth);
    const confirmed = window.confirm(t('options_usage_confirm_reset', [monthLabel]));
    if (!confirmed) {
      return;
    }

    await clearMonthlyUsage(this.usageMonth);
    await this.loadUsage();
    toastFrom(this, t('options_usage_reset_toast'), 'success');
  }

  private renderUsageSection() {
    if (this.usageLoading || this.usage === null) {
      return html`<p class="usage-empty">${t('options_usage_loading')}</p>`;
    }

    const usage = this.usage;
    const estimatedUsd = estimateTokenCostUsd(usage.token_input, usage.token_output);
    const featureRows = AI_USAGE_FEATURES.map((feature) => {
      const stats = usage.by_feature[feature];
      if (stats === undefined || stats.request_count === 0) {
        return nothing;
      }
      const featureCost = estimateTokenCostUsd(stats.token_input, stats.token_output);
      return html`
        <tr>
          <td>${getAiUsageFeatureLabel(feature)}</td>
          <td>${String(stats.request_count)}</td>
          <td>${formatTokenCount(stats.token_input)} / ${formatTokenCount(stats.token_output)}</td>
          <td>${formatUsdEstimate(featureCost)}</td>
        </tr>
      `;
    });

    const hasUsage = usage.request_count > 0;

    return html`
      <div class="usage-summary">
        <p>${t('options_usage_target_month')} <strong>${usage.month}</strong></p>
        <p>${t('options_usage_requests')} <strong>${String(usage.request_count)}</strong></p>
        <p>
          ${t('options_usage_tokens')} <strong>${formatTokenCount(usage.token_input)}</strong> /
          ${t('options_usage_tokens_output')}
          <strong>${formatTokenCount(usage.token_output)}</strong>
        </p>
        <p class="cost">${t('options_usage_estimated_cost')} ${formatUsdEstimate(estimatedUsd)}</p>
        <p class="hint">
          ${t('options_usage_pricing_note', [
            GEMINI_FLASH_PRICING.model,
            String(GEMINI_FLASH_PRICING.input_per_million_usd),
            String(GEMINI_FLASH_PRICING.output_per_million_usd),
            GEMINI_FLASH_PRICING.last_verified,
          ])}
        </p>
      </div>
      ${hasUsage
        ? html`
            <table class="usage-table">
              <thead>
                <tr>
                  <th scope="col">${t('options_usage_table_feature')}</th>
                  <th scope="col">${t('options_usage_table_count')}</th>
                  <th scope="col">${t('options_usage_table_tokens')}</th>
                  <th scope="col">${t('options_usage_table_estimate')}</th>
                </tr>
              </thead>
              <tbody>
                ${featureRows}
              </tbody>
            </table>
          `
        : html`<p class="usage-empty">${t('options_usage_empty_month')}</p>`}
      <div class="usage-actions">
        <button
          type="button"
          class="btn btn--danger"
          aria-label=${t('options_usage_reset_button')}
          ?disabled=${!hasUsage}
          @click=${() => {
            void this.handleResetUsage();
          }}
        >
          ${t('options_usage_reset_button')}
        </button>
      </div>
    `;
  }

  private renderGeneralSection() {
    return html`<mw-general-settings></mw-general-settings>`;
  }

  private renderAiSection() {
    return html`
      <h1>${t('options_section_ai')}</h1>
      <p class="section-lead">${t('options_ai_section_lead')}</p>
      <mw-ai-settings></mw-ai-settings>
      <h2 class="usage-heading">${t('options_usage_heading')}</h2>
      <p class="hint">${t('options_usage_hint')}</p>
      ${this.renderUsageSection()}
    `;
  }

  private renderTagsSection() {
    return html`
      <h1>${t('options_section_tags')}</h1>
      <p class="section-lead">${t('options_tags_lead')}</p>
      <mw-tag-manager></mw-tag-manager>
    `;
  }

  private renderProjectsSection() {
    return html`
      <h1>${t('options_section_projects')}</h1>
      <p class="section-lead">${t('options_projects_lead')}</p>
      <mw-project-manager></mw-project-manager>
    `;
  }

  private renderPremiumSection() {
    return html`
      <h1>${t('options_section_premium')}</h1>
      <p class="section-lead">${t('options_premium_lead')}</p>
      <mw-premium-section></mw-premium-section>
    `;
  }

  private renderDataSection() {
    return html`
      <h1>${t('options_section_data')}</h1>
      <p class="section-lead">${t('options_data_section_lead')}</p>
      <mw-data-section></mw-data-section>
    `;
  }

  private renderAboutSection() {
    return html`
      <h1>${t('options_section_about')}</h1>
      <p class="section-lead">${t('options_about_lead')}</p>
      <mw-about-section></mw-about-section>
    `;
  }

  private renderMainContent() {
    switch (this.activeSection) {
      case 'general':
        return this.renderGeneralSection();
      case 'ai':
        return this.renderAiSection();
      case 'tags':
        return this.renderTagsSection();
      case 'projects':
        return this.renderProjectsSection();
      case 'premium':
        return this.renderPremiumSection();
      case 'data':
        return this.renderDataSection();
      case 'about':
        return this.renderAboutSection();
      default:
        return this.renderGeneralSection();
    }
  }

  render() {
    return html`
      <div class="shell">
        <nav class="sidebar" aria-label=${t('options_main_sidebar_aria')}>
          <div class="brand-row">
            <p class="brand">Markwell</p>
            <mw-tier-badge
              .tier=${this.licenseTier}
              .trialRemainingLabel=${this.trialRemainingLabel}
              ?trialUrgent=${this.trialUrgent}
              @mw-tier-badge-click=${() => {
                void this.openPurchaseModal();
              }}
            ></mw-tier-badge>
          </div>
          <div class="nav">
            ${SECTIONS.map(
              (section) => html`
                <button
                  type="button"
                  class="nav-btn ${this.activeSection === section.id ? 'nav-btn--active' : ''}"
                  aria-label=${t(section.labelKey)}
                  aria-current=${this.activeSection === section.id ? 'page' : 'false'}
                  @click=${() => {
                    this.selectSection(section.id);
                  }}
                >
                  ${t(section.labelKey)}
                </button>
              `,
            )}
          </div>
        </nav>
        <main class="main">
          ${this.licenseRevokedBanner !== null
            ? html`
                <div class="license-revoked-banner" role="status">
                  ${this.licenseRevokedBanner}
                </div>
              `
            : nothing}
          ${this.renderMainContent()}
        </main>
      </div>
      <mw-upgrade-modal
        .open=${this.upgradeModal.open}
        .featureName=${this.upgradeModal.featureName}
        .limit=${this.upgradeModal.limit}
        .highlightFeature=${this.upgradeModal.highlightFeature}
        .showFeatureList=${this.upgradeModal.showFeatureList}
        .trialUsed=${this.upgradeModal.trialUsed}
        @mw-close=${() => {
          this.closeUpgradeModal();
        }}
        @mw-trial-started=${() => {
          void this.onTrialStarted();
        }}
      ></mw-upgrade-modal>
      <mw-toast-stack data-placement="options"></mw-toast-stack>
    `;
  }
}
