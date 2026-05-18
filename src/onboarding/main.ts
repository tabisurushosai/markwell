import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { getSettings, setSettings } from '../shared/storage/settings.js';
import { hasUsedTrial, startTrial, TrialAlreadyUsedError } from '../shared/license/start-trial.js';

@customElement('mw-onboarding')
export class MwOnboarding extends LitElement {
  @state() private step = 1;

  @state() private trialUsed = false;

  @state() private startingTrial = false;

  @state() private trialMessage = '';

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      padding: 40px 24px;
      box-sizing: border-box;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: system-ui, -apple-system, sans-serif;
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
    }

    .trial-note {
      margin: 12px 0 0;
      font-size: 12px;
      color: #c88;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }

  private async load(): Promise<void> {
    this.trialUsed = await hasUsedTrial();
  }

  private async finishOnboarding(): Promise<void> {
    await setSettings({ onboarding_seen: true });
    window.close();
  }

  private async handleStartTrial(): Promise<void> {
    if (this.startingTrial || this.trialUsed) {
      return;
    }

    this.startingTrial = true;
    this.trialMessage = '';
    try {
      await startTrial();
      await this.finishOnboarding();
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

  private renderStep1() {
    return html`
      <p class="step-label">Step 1 / 2</p>
      <h1>Markwell へようこそ</h1>
      <p>
        ウェブページのハイライトを保存し、AI で論考やタグ付けを行う Chrome 拡張機能です。まずは基本を確認してから、Premium
        トライアルをご案内します。
      </p>
      <div class="actions">
        <button
          type="button"
          class="btn btn--primary"
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
      <p class="step-label">Step 2 / 2</p>
      <h1>Premium を試す</h1>
      <p>7 日間、Premium 機能を無料でお試しいただけます。メール登録は不要です。</p>
      <div class="actions">
        <button
          type="button"
          class="btn btn--primary"
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
          ?disabled=${this.startingTrial}
          @click=${() => {
            void this.finishOnboarding();
          }}
        >
          スキップ
        </button>
      </div>
      ${this.trialUsed
        ? html`<p class="trial-note">トライアルは 1 回のみ</p>`
        : this.trialMessage !== ''
          ? html`<p class="trial-note">${this.trialMessage}</p>`
          : null}
    `;
  }

  render() {
    return html`
      <div class="card">
        ${this.step === 1 ? this.renderStep1() : this.renderStep2()}
      </div>
    `;
  }
}

document.body.appendChild(document.createElement('mw-onboarding'));
