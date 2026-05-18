import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { getSettings, setSettings } from '../shared/storage/settings.js';
import { isValidRegExp } from '../shared/utils/regexp.js';
import { toastFrom } from '../shared/components/toast.js';
import { optionsAccessibilityStyles } from './styles.js';

@customElement('mw-blocked-sites')
export class MwBlockedSites extends LitElement {
  @state() private loading = true;

  @state() private blockedDomains: string[] = [];

  @state() private blockedUrlPatterns: string[] = [];

  @state() private domainInput = '';

  @state() private patternInput = '';

  @state() private patternInputInvalid = false;



  static styles = [...optionsAccessibilityStyles, css`
    :host {
      display: block;
    }

    .section {
      margin-bottom: 28px;
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

    .add-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      max-width: 560px;
    }

    .add-input {
      flex: 1 1 200px;
      min-width: 0;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .add-input:focus {
      outline: 2px solid #ffd34e;
      outline-offset: 0;
      border-color: #ffd34e;
    }

    .add-input--invalid {
      border-color: #c44;
      outline-color: #c44;
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

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px 4px 10px;
      border: 1px solid #444;
      border-radius: 999px;
      background: #242424;
      font-size: 13px;
      color: #e0e0e0;
    }

    .chip-remove {
      padding: 0 2px;
      border: none;
      background: transparent;
      color: #aaa;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }

    .chip-remove:hover {
      color: #f0a0a0;
    }

    .empty-chips {
      margin: 12px 0 0;
      font-size: 12px;
      color: #666;
    }

  `];

  connectedCallback(): void {
    super.connectedCallback();
    void this.load();
  }


  private async load(): Promise<void> {
    this.loading = true;
    const settings = await getSettings();
    this.blockedDomains = [...settings.blocked_domains];
    this.blockedUrlPatterns = [...settings.blocked_url_patterns];
    this.loading = false;
  }

  private normalizeDomain(value: string): string {
    return value.trim().toLowerCase();
  }

  private async persist(
    patch: { blocked_domains?: string[]; blocked_url_patterns?: string[] },
    message: string,
  ): Promise<boolean> {
    try {
      const next = await setSettings(patch);
      this.blockedDomains = [...next.blocked_domains];
      this.blockedUrlPatterns = [...next.blocked_url_patterns];
      toastFrom(this, message, 'success');
      return true;
    } catch {
      toastFrom(this, '保存に失敗しました', 'error');
      return false;
    }
  }

  private async handleAddDomain(): Promise<void> {
    const domain = this.normalizeDomain(this.domainInput);
    if (domain === '') {
      toastFrom(this, 'ドメインを入力してください', 'warning');
      return;
    }
    if (this.blockedDomains.some((entry) => entry.toLowerCase() === domain)) {
      toastFrom(this, '同じドメインが既に登録されています', 'warning');
      return;
    }

    const ok = await this.persist(
      { blocked_domains: [...this.blockedDomains, domain] },
      'ドメインを追加しました',
    );
    if (ok) {
      this.domainInput = '';
    }
  }

  private async handleRemoveDomain(domain: string): Promise<void> {
    await this.persist(
      { blocked_domains: this.blockedDomains.filter((entry) => entry !== domain) },
      'ドメインを削除しました',
    );
  }

  private onPatternInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const value = input.value;
    this.patternInput = value;
    const trimmed = value.trim();
    this.patternInputInvalid = trimmed !== '' && !isValidRegExp(trimmed);
  }

  private async handleAddPattern(): Promise<void> {
    const pattern = this.patternInput.trim();
    if (pattern === '') {
      toastFrom(this, 'URL パターンを入力してください', 'warning');
      return;
    }
    if (!isValidRegExp(pattern)) {
      this.patternInputInvalid = true;
      toastFrom(this, '正規表現の構文が不正です', 'error');
      return;
    }
    if (this.blockedUrlPatterns.includes(pattern)) {
      toastFrom(this, '同じパターンが既に登録されています', 'warning');
      return;
    }

    const ok = await this.persist(
      { blocked_url_patterns: [...this.blockedUrlPatterns, pattern] },
      'URL パターンを追加しました',
    );
    if (ok) {
      this.patternInput = '';
      this.patternInputInvalid = false;
    }
  }

  private async handleRemovePattern(pattern: string): Promise<void> {
    await this.persist(
      { blocked_url_patterns: this.blockedUrlPatterns.filter((entry) => entry !== pattern) },
      'URL パターンを削除しました',
    );
  }

  private renderChips(items: string[], onRemove: (value: string) => void) {
    if (items.length === 0) {
      return html`<p class="empty-chips">登録なし</p>`;
    }

    return html`
      <div class="chips">
        ${items.map(
          (item) => html`
            <span class="chip">
              <span>${item}</span>
              <button
                type="button"
                class="chip-remove"
                aria-label="${item} を削除"
                @click=${() => {
                  void onRemove(item);
                }}
              >
                ×
              </button>
            </span>
          `,
        )}
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`<p class="hint">ブロック設定を読み込み中…</p>`;
    }

    const patternTrimmed = this.patternInput.trim();
    const canAddPattern =
      patternTrimmed !== '' && isValidRegExp(patternTrimmed) && !this.patternInputInvalid;

    return html`
      <section class="section" aria-labelledby="blocked-domains-title">
        <span id="blocked-domains-title" class="section-title">ブロックドメイン</span>
        <div class="add-row">
          <input
            class="add-input"
            type="text"
            placeholder="example.com"
            .value=${this.domainInput}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLInputElement) {
                this.domainInput = input.value;
              }
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void this.handleAddDomain();
              }
            }}
          />
          <button
            type="button"
            class="btn btn--primary"
            aria-label="追加"
            @click=${() => {
              void this.handleAddDomain();
            }}
          >
            追加
          </button>
        </div>
        ${this.renderChips(this.blockedDomains, (domain) => this.handleRemoveDomain(domain))}
        <p class="hint">Markwell の content script を無効にするドメインです。</p>
      </section>

      <section class="section" aria-labelledby="blocked-patterns-title">
        <span id="blocked-patterns-title" class="section-title">ブロック URL パターン</span>
        <div class="add-row">
          <input
            class="add-input ${this.patternInputInvalid ? 'add-input--invalid' : ''}"
            type="text"
            placeholder="^https://example\\.com/private"
            .value=${this.patternInput}
            @input=${(event: Event) => {
              this.onPatternInput(event);
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Enter' && canAddPattern) {
                event.preventDefault();
                void this.handleAddPattern();
              }
            }}
          />
          <button
            type="button"
            class="btn btn--primary"
            aria-label="追加"
            ?disabled=${!canAddPattern}
            @click=${() => {
              void this.handleAddPattern();
            }}
          >
            追加
          </button>
        </div>
        ${this.renderChips(this.blockedUrlPatterns, (pattern) => this.handleRemovePattern(pattern))}
        <p class="hint">正規表現 (new RegExp) で URL 全体にマッチした場合にブロックします。</p>
      </section>

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-blocked-sites': MwBlockedSites;
  }
}
