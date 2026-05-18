import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { estimateTokenCostUsd, formatUsdEstimate, GEMINI_FLASH_PRICING } from '../shared/ai/pricing.js';
import { TRANSLATE_LANGUAGE_LABELS } from '../shared/ai/translation.js';
import {
  AI_USAGE_FEATURE_LABELS,
  AI_USAGE_FEATURES,
  clearMonthlyUsage,
  currentUsageMonth,
  getMonthlyUsage,
  type MonthlyUsageRecord,
} from '../shared/ai/usage.js';
import { getSettings, setSettings } from '../shared/storage/settings.js';

import './tag-manager.js';

function formatTokenCount(value: number): string {
  return value.toLocaleString('ja-JP');
}

@customElement('mw-options')
export class MwOptions extends LitElement {
  @state() private translateTargetLang = 'ja';

  @state() private saved = false;

  @state() private usageMonth = currentUsageMonth();

  @state() private usage: MonthlyUsageRecord | null = null;

  @state() private usageLoading = true;

  @state() private usageMessage = '';

  static styles = css`
    :host {
      display: block;
      padding: 24px;
      font-family: system-ui, sans-serif;
      color: #e0e0e0;
      background: #1a1a1a;
    }

    h1 {
      margin: 0 0 16px;
      font-size: 20px;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 16px;
    }

    section {
      margin-bottom: 28px;
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
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.loadSettings();
    void this.loadUsage();
  }

  private async loadSettings(): Promise<void> {
    const settings = await getSettings();
    this.translateTargetLang = settings.translate_target_lang;
  }

  private async loadUsage(): Promise<void> {
    this.usageLoading = true;
    this.usageMonth = currentUsageMonth();
    this.usage = await getMonthlyUsage(this.usageMonth);
    this.usageLoading = false;
  }

  private async onLangChange(event: Event): Promise<void> {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    this.translateTargetLang = select.value;
    await setSettings({ translate_target_lang: select.value });
    this.saved = true;
    window.setTimeout(() => {
      this.saved = false;
    }, 2000);
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

  render() {
    return html`
      <h1>Markwell 設定</h1>
      <section>
        <label for="translate-lang">ハイライト翻訳の既定言語</label>
        <select
          id="translate-lang"
          .value=${this.translateTargetLang}
          @change=${(event: Event) => {
            void this.onLangChange(event);
          }}
        >
          ${Object.entries(TRANSLATE_LANGUAGE_LABELS).map(
            ([code, label]) => html`
              <option value=${code}>${label}</option>
            `,
          )}
        </select>
        <p class="hint">popup の「🌐 翻訳」で使用します。API キーが必要です。</p>
        ${this.saved ? html`<p class="status">保存しました</p>` : ''}
      </section>

      <section aria-labelledby="tags-title">
        <h2 id="tags-title">タグ</h2>
        <p class="hint">タグの作成・名前変更・統合・削除ができます。検索で絞り込めます。</p>
        <mw-tag-manager></mw-tag-manager>
      </section>

      <section aria-labelledby="ai-usage-title">
        <h2 id="ai-usage-title">AI 使用量</h2>
        <p class="hint">ローカルに保存された当月の Gemini 利用量です。外部には送信されません。</p>
        ${this.renderUsageSection()}
      </section>
    `;
  }
}

document.body.appendChild(document.createElement('mw-options'));
