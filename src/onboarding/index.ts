import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { ONBOARDING_TRY_PAGE_URL } from '../shared/onboarding/constants.js';
import { hasUsedTrial, startTrial, TrialAlreadyUsedError } from '../shared/license/start-trial.js';
import { accessibilityStyles } from '../shared/styles/accessibility.js';
import { getSettings, setSettings } from '../shared/storage/settings.js';
import './demo-animation.js';

const TOTAL_STEPS = 3;

@customElement('mw-onboarding')
export class MwOnboarding extends LitElement {
  @state() private step = 1;

  @state() private trialUsed = false;

  @state() private startingTrial = false;

  @state() private trialMessage = '';

  @state() private dontShowAgain = false;

  static styles = [
    accessibilityStyles,
    css`
    :host {
      display: block;
      min-height: 100vh;
      padding: 40px 24px;
      box-sizing: border-box;
      --accent: #ffd34e;
      --bg: #1a1a1a;
      --text: #e0e0e0;
      background: var(--bg);
      color: var(--text);
      font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        sans-serif;
    }

    .card {
      max-width: 520px;
      margin: 0 auto;
      padding: 28px;
      border: 1px solid #333;
      border-radius: 12px;
      background: #242424;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      color: #ffd34e;
    }

    p {
      margin: 0 0 16px;
      font-size: 14px;
      line-height: 1.6;
      color: #ccc;
    }

    .step-label {
      margin: 0 0 20px;
      font-size: 12px;
      color: #888;
    }

    .dots {
      display: flex;
      gap: 6px;
      margin: 0 0 20px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #444;
    }

    .dot--active {
      background: #ffd34e;
    }

    .shortcut-list {
      margin: 0 0 16px;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .shortcut-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
    }

    kbd {
      flex-shrink: 0;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #555;
      background: #2a2a2a;
      font-family: inherit;
      font-size: 12px;
      color: #ffd34e;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
    }

    .btn {
      padding: 10px 14px;
      border: 1px solid #444;
      border-radius: 8px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
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
      font-weight: 600;
    }

    .trial-note {
      margin: 12px 0 0;
      font-size: 12px;
      color: #c88;
    }

    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #333;
    }

    .checkbox-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #aaa;
      cursor: pointer;
    }

    .checkbox-row input {
      width: 16px;
      height: 16px;
      accent-color: #ffd34e;
    }
  `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    const [trialUsed, settings] = await Promise.all([hasUsedTrial(), getSettings()]);
    this.trialUsed = trialUsed;
    this.dontShowAgain = settings.onboarding_seen;
  }

  private stepLabel(): string {
    return `Step ${String(this.step)} / ${String(TOTAL_STEPS)}`;
  }

  private renderDots() {
    return html`
      <div class="dots" aria-hidden="true">
        ${[1, 2, 3].map(
          (n) => html`<span class="dot ${this.step === n ? 'dot--active' : ''}"></span>`,
        )}
      </div>
    `;
  }

  private async persistDontShowAgainIfChecked(): Promise<void> {
    if (this.dontShowAgain) {
      await setSettings({ onboarding_seen: true });
    }
  }

  private async completeOnboarding(): Promise<void> {
    await this.persistDontShowAgainIfChecked();
    window.close();
  }

  private async handleStartTrial(): Promise<void> {
    if (this.startingTrial) {
      return;
    }

    if (this.trialUsed) {
      this.step = 3;
      return;
    }

    this.startingTrial = true;
    this.trialMessage = '';
    try {
      await startTrial();
      this.step = 3;
    } catch (error) {
      if (error instanceof TrialAlreadyUsedError) {
        this.trialUsed = true;
        this.trialMessage = 'トライアルは 1 回のみ';
      } else {
        this.trialMessage = 'トライアルの開始に失敗しました';
      }
    } finally {
      this.startingTrial = false;
    }
  }

  private async handleTryIt(): Promise<void> {
    await chrome.tabs.create({ url: ONBOARDING_TRY_PAGE_URL });
    await this.completeOnboarding();
  }

  private handleDontShowAgainChange(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.dontShowAgain = input.checked;
    }
  }

  private renderFooter() {
    if (this.step !== 3) {
      return nothing;
    }

    return html`
      <div class="footer">
        <label class="checkbox-row">
          <input
            type="checkbox"
            .checked=${this.dontShowAgain}
            @change=${this.handleDontShowAgainChange}
          />
          次回から表示しない
        </label>
      </div>
    `;
  }

  private renderStep1() {
    return html`
      <p class="step-label">${this.stepLabel()}</p>
      ${this.renderDots()}
      <h1>Markwell とは</h1>
      <p>
        ウェブ上のテキストをハイライトして保存し、タグ付けや AI 合成で知識をつなげる Chrome 拡張機能です。
      </p>
      <mw-onboarding-demo></mw-onboarding-demo>
      <p>テキストを選択してハイライトすると、ページ上に色付きのマーカーが残ります。</p>
      <div class="actions">
        <button
          type="button"
          class="btn btn--primary"
          aria-label="次へ"
          @click=${() => {
            this.step = 2;
          }}
        >
          次へ
        </button>
      </div>
    `;
  }

  private renderStep2() {
    return html`
      <p class="step-label">${this.stepLabel()}</p>
      ${this.renderDots()}
      <h1>7 日間 Premium トライアル</h1>
      <p>7 日間、Premium 機能を無料でお試しいただけます。メール登録は不要です。</p>
      <div class="actions">
        <button
          type="button"
          class="btn btn--primary"
          aria-label=${this.startingTrial ? '開始中…' : '無料で 7 日間 Premium を試す'}
          ?disabled=${this.trialUsed || this.startingTrial}
          @click=${() => {
            void this.handleStartTrial();
          }}
        >
          ${this.startingTrial ? '開始中…' : '無料で 7 日間 Premium を試す'}
        </button>
        <button
          type="button"
          class="btn"
          aria-label="スキップ"
          ?disabled=${this.startingTrial}
          @click=${() => {
            this.step = 3;
          }}
        >
          スキップ
        </button>
        <button
          type="button"
          class="btn"
          aria-label="戻る"
          @click=${() => {
            this.step = 1;
          }}
        >
          戻る
        </button>
      </div>
      ${this.trialUsed
        ? html`<p class="trial-note">トライアルは 1 回のみ。ショートカットの説明に進めます。</p>`
        : this.trialMessage !== ''
          ? html`<p class="trial-note">${this.trialMessage}</p>`
          : null}
    `;
  }

  private renderStep3() {
    return html`
      <p class="step-label">${this.stepLabel()}</p>
      ${this.renderDots()}
      <h1>ショートカット</h1>
      <p>どのページでもすぐに使えるキーボードショートカットです。</p>
      <ul class="shortcut-list">
        <li class="shortcut-item">
          <kbd>Alt+H</kbd>
          <span>選択中のテキストをデフォルト色でハイライト保存</span>
        </li>
        <li class="shortcut-item">
          <kbd>Alt+S</kbd>
          <span>合成サイドパネルを開く</span>
        </li>
      </ul>
      <p>Wikipedia でテキストを選択し、Alt+H を押してお試しください。</p>
      <div class="actions">
        <button
          type="button"
          class="btn btn--primary"
          aria-label="使ってみる"
          @click=${() => {
            void this.handleTryIt();
          }}
        >
          使ってみる
        </button>
        <button
          type="button"
          class="btn"
          aria-label="完了"
          @click=${() => {
            void this.completeOnboarding();
          }}
        >
          完了
        </button>
        <button
          type="button"
          class="btn"
          aria-label="戻る"
          @click=${() => {
            this.step = 2;
          }}
        >
          戻る
        </button>
      </div>
      ${this.renderFooter()}
    `;
  }

  render() {
    let body;
    if (this.step === 1) {
      body = this.renderStep1();
    } else if (this.step === 2) {
      body = this.renderStep2();
    } else {
      body = this.renderStep3();
    }

    return html`<div class="card">${body}</div>`;
  }
}

document.body.appendChild(document.createElement('mw-onboarding'));
