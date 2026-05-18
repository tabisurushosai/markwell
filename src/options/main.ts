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
import { getCurrentTier, getLicenseStatus } from '../shared/storage/license.js';
import '../shared/ui/tier-badge.js';
import '../shared/ui/premium-dialog.js';
import type { PremiumDialogMode } from '../shared/ui/premium-dialog.js';
import {
  AI_USAGE_FEATURE_LABELS,
  AI_USAGE_FEATURES,
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

type OptionsSection = 'general' | 'ai' | 'tags' | 'projects' | 'premium' | 'data' | 'about';

const SECTIONS: ReadonlyArray<{ id: OptionsSection; label: string }> = [
  { id: 'general', label: '一般' },
  { id: 'ai', label: 'AI' },
  { id: 'tags', label: 'タグ' },
  { id: 'projects', label: 'プロジェクト' },
  { id: 'premium', label: 'Premium' },
  { id: 'data', label: 'データ' },
  { id: 'about', label: 'About' },
];

function formatTokenCount(value: number): string {
  return value.toLocaleString('ja-JP');
}

@customElement('mw-options')
export class MwOptions extends LitElement {
  @state() private activeSection: OptionsSection = 'general';

  @state() private usageMonth = currentUsageMonth();

  @state() private usage: MonthlyUsageRecord | null = null;

  @state() private usageLoading = true;

  @state() private usageMessage = '';

  @state() private licenseTier: LicenseTier = 'free';

  @state() private trialRemainingLabel = '';

  @state() private trialUrgent = false;

  @state() private premiumDialogOpen = false;

  @state() private premiumDialogMode: PremiumDialogMode = 'purchase';

  static styles = css`
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
  `;

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
    if (tier === 'trial' && license.trial_end !== null) {
      const days = getTrialDaysRemaining(license.trial_end);
      this.trialRemainingLabel = formatTrialRemainingLabel(days);
      this.trialUrgent = isTrialUrgent(days);
    } else {
      this.trialRemainingLabel = '';
      this.trialUrgent = false;
    }
  }

  private openPurchaseModal(): void {
    this.premiumDialogMode = 'purchase';
    this.premiumDialogOpen = true;
  }

  private closePremiumDialog(): void {
    this.premiumDialogOpen = false;
  }

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
    const monthLabel = this.usageMonth.replace('-', '年') + '月';
    const confirmed = window.confirm(
      `${monthLabel}の AI 使用量データをリセットしますか？\nこの操作は取り消せません。`,
    );
    if (!confirmed) {
      return;
    }

    await clearMonthlyUsage(this.usageMonth);
    await this.loadUsage();
    this.usageMessage = '当月の使用量をリセットしました';
    window.setTimeout(() => {
      this.usageMessage = '';
    }, 2000);
  }

  private renderUsageSection() {
    if (this.usageLoading || this.usage === null) {
      return html`<p class="usage-empty">使用量を読み込み中…</p>`;
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
          <td>${AI_USAGE_FEATURE_LABELS[feature]}</td>
          <td>${String(stats.request_count)}</td>
          <td>${formatTokenCount(stats.token_input)} / ${formatTokenCount(stats.token_output)}</td>
          <td>${formatUsdEstimate(featureCost)}</td>
        </tr>
      `;
    });

    const hasUsage = usage.request_count > 0;

    return html`
      <div class="usage-summary">
        <p>対象月: <strong>${usage.month}</strong></p>
        <p>リクエスト数: <strong>${String(usage.request_count)}</strong></p>
        <p>
          トークン数: 入力 <strong>${formatTokenCount(usage.token_input)}</strong> / 出力
          <strong>${formatTokenCount(usage.token_output)}</strong>
        </p>
        <p class="cost">概算コスト: ${formatUsdEstimate(estimatedUsd)}</p>
        <p class="hint">
          ${GEMINI_FLASH_PRICING.model} 単価（入力 $${GEMINI_FLASH_PRICING.input_per_million_usd}/1M・出力
          $${GEMINI_FLASH_PRICING.output_per_million_usd}/1M、確認日 ${GEMINI_FLASH_PRICING.last_verified}）に基づく概算です。
        </p>
      </div>
      ${hasUsage
        ? html`
            <table class="usage-table">
              <thead>
                <tr>
                  <th scope="col">機能</th>
                  <th scope="col">回数</th>
                  <th scope="col">トークン (入/出)</th>
                  <th scope="col">概算</th>
                </tr>
              </thead>
              <tbody>
                ${featureRows}
              </tbody>
            </table>
          `
        : html`<p class="usage-empty">今月はまだ AI 機能の利用記録がありません。</p>`}
      <div class="usage-actions">
        <button
          type="button"
          class="btn btn--danger"
          ?disabled=${!hasUsage}
          @click=${() => {
            void this.handleResetUsage();
          }}
        >
          当月データをリセット
        </button>
      </div>
      ${this.usageMessage !== '' ? html`<p class="status">${this.usageMessage}</p>` : nothing}
    `;
  }

  private renderGeneralSection() {
    return html`<mw-general-settings></mw-general-settings>`;
  }

  private renderAiSection() {
    return html`
      <h1>AI</h1>
      <p class="section-lead">Gemini API キーとモデルの設定、および当月の利用量です。</p>
      <mw-ai-settings></mw-ai-settings>
      <h2 class="usage-heading">使用量</h2>
      <p class="hint">ローカルに保存された当月の Gemini 利用量です。外部には送信されません。</p>
      ${this.renderUsageSection()}
    `;
  }

  private renderTagsSection() {
    return html`
      <h1>タグ</h1>
      <p class="section-lead">
        タグ名をクリックして名前変更、または「他のタグに統合」でマージできます（統合は確認後に実行）。
      </p>
      <mw-tag-manager></mw-tag-manager>
    `;
  }

  private renderProjectsSection() {
    return html`
      <h1>プロジェクト</h1>
      <p class="section-lead">
        プロジェクトの作成・編集・削除ができます。削除してもハイライト自体は残り、プロジェクト未所属になります。Free
        プランでは最大 2 個まで作成できます。
      </p>
      <mw-project-manager></mw-project-manager>
    `;
  }

  private renderPremiumSection() {
    return html`
      <h1>Premium</h1>
      <p class="section-lead">ライセンスと Premium 機能の管理です。</p>
      <mw-premium-section></mw-premium-section>
    `;
  }

  private renderDataSection() {
    return html`
      <h1>データ</h1>
      <p class="section-lead">ハイライトのエクスポート・インポートとバックアップです。</p>
      <mw-data-section></mw-data-section>
    `;
  }

  private renderAboutSection() {
    return html`
      <h1>About</h1>
      <p class="section-lead">Markwell のバージョン情報とリンクです。</p>
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
        <nav class="sidebar" aria-label="設定セクション">
          <div class="brand-row">
            <p class="brand">Markwell</p>
            <mw-tier-badge
              .tier=${this.licenseTier}
              .trialRemainingLabel=${this.trialRemainingLabel}
              ?trialUrgent=${this.trialUrgent}
              @mw-tier-badge-click=${() => {
                this.openPurchaseModal();
              }}
            ></mw-tier-badge>
          </div>
          <div class="nav">
            ${SECTIONS.map(
              (section) => html`
                <button
                  type="button"
                  class="nav-btn ${this.activeSection === section.id ? 'nav-btn--active' : ''}"
                  aria-current=${this.activeSection === section.id ? 'page' : 'false'}
                  @click=${() => {
                    this.selectSection(section.id);
                  }}
                >
                  ${section.label}
                </button>
              `,
            )}
          </div>
        </nav>
        <main class="main">${this.renderMainContent()}</main>
      </div>
      <mw-premium-dialog
        .open=${this.premiumDialogOpen}
        .mode=${this.premiumDialogMode}
        @mw-close=${() => {
          this.closePremiumDialog();
        }}
      ></mw-premium-dialog>
    `;
  }
}
