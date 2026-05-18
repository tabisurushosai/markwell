import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

type TabId = 'page' | 'all' | 'projects';
type TierBadge = 'FREE' | 'TRIAL' | 'PREMIUM';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'page', label: '現在のページ' },
  { id: 'all', label: 'すべて' },
  { id: 'projects', label: 'プロジェクト' },
];

@customElement('markwell-popup-root')
export class MarkwellPopupRoot extends LitElement {
  @state() private activeTab: TabId = 'page';
  @state() private searchQuery = '';
  @state() private tier: TierBadge = 'FREE';

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      width: 400px;
      height: 600px;
      background: #1a1a1a;
      color: #e5e5e5;
      font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        sans-serif;
      font-size: 13px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-bottom: 1px solid #2e2e2e;
      flex-shrink: 0;
    }

    .search {
      flex: 1;
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid #333;
      border-radius: 6px;
      background: #252525;
      color: #e5e5e5;
      font-size: 13px;
    }

    .search::placeholder {
      color: #888;
    }

    .search:focus {
      outline: 2px solid #4a7cff;
      outline-offset: 0;
      border-color: #4a7cff;
    }

    .tier-badge {
      flex-shrink: 0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      background: #2a2a2a;
      color: #a3a3a3;
      border: 1px solid #3a3a3a;
    }

    .tier-badge[data-tier='TRIAL'] {
      color: #fbbf24;
      border-color: #92400e;
      background: #422006;
    }

    .tier-badge[data-tier='PREMIUM'] {
      color: #a78bfa;
      border-color: #5b21b6;
      background: #2e1065;
    }

    .tabs {
      display: flex;
      gap: 0;
      padding: 0 12px;
      border-bottom: 1px solid #2e2e2e;
      flex-shrink: 0;
    }

    .tab {
      flex: 1;
      padding: 10px 4px;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: #888;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: -1px;
    }

    .tab:hover {
      color: #ccc;
    }

    .tab[aria-selected='true'] {
      color: #e5e5e5;
      border-bottom-color: #4a7cff;
    }

    .main {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 12px;
    }

    .panel-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 600;
      color: #a3a3a3;
    }

    .placeholder {
      margin: 0;
      padding: 24px 12px;
      text-align: center;
      color: #666;
      border: 1px dashed #333;
      border-radius: 8px;
      background: #222;
    }

    .project-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .project-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 10px 12px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 8px;
    }

    .project-name {
      font-weight: 500;
      color: #e5e5e5;
    }

    .btn-open {
      flex-shrink: 0;
      padding: 6px 10px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #333;
      color: #e5e5e5;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-open:hover {
      background: #404040;
    }

    .footer {
      display: flex;
      gap: 6px;
      padding: 10px 12px;
      border-top: 1px solid #2e2e2e;
      flex-shrink: 0;
    }

    .footer-btn {
      flex: 1;
      padding: 8px 6px;
      border: 1px solid #333;
      border-radius: 6px;
      background: #252525;
      color: #ccc;
      font-size: 11px;
      cursor: pointer;
    }

    .footer-btn:hover {
      background: #333;
      color: #fff;
    }
  `;

  private onSearchInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    this.searchQuery = input.value;
  }

  private selectTab(tabId: TabId): void {
    this.activeTab = tabId;
  }

  private renderTabPanel() {
    switch (this.activeTab) {
      case 'page':
        return html`
          <h2 class="panel-title">このページのハイライト</h2>
          <p class="placeholder">ハイライトはまだありません</p>
        `;
      case 'all':
        return html`
          <h2 class="panel-title">全ページ横断検索</h2>
          <p class="placeholder">
            ${this.searchQuery
              ? `「${this.searchQuery}」で検索（実装予定）`
              : '検索ボックスにキーワードを入力してください'}
          </p>
        `;
      case 'projects':
        return html`
          <h2 class="panel-title">プロジェクト</h2>
          <ul class="project-list">
            <li class="project-item">
              <span class="project-name">サンプルプロジェクト</span>
              <button
                type="button"
                class="btn-open"
                @click=${() => {
                  this.handleOpenSidePanel();
                }}
              >
                開く
              </button>
            </li>
          </ul>
        `;
      default:
        return nothing;
    }
  }

  private handleOpenOptions(): void {
    void chrome.runtime.openOptionsPage();
  }

  private handleOpenSidePanel(): void {
    void (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        return;
      }
      await chrome.sidePanel.open({ windowId: tabs[0].windowId });
    })();
  }

  private handleOpenHelp(): void {
    void chrome.tabs.create({ url: 'https://github.com/markwell' });
  }

  render() {
    return html`
      <header class="header">
        <input
          class="search"
          type="search"
          placeholder="検索..."
          .value=${this.searchQuery}
          @input=${(event: Event) => {
            this.onSearchInput(event);
          }}
        />
        <span class="tier-badge" data-tier=${this.tier}>${this.tier}</span>
      </header>

      <nav class="tabs" role="tablist">
        ${TABS.map(
          (tab) => html`
            <button
              type="button"
              class="tab"
              role="tab"
              aria-selected=${this.activeTab === tab.id}
              @click=${() => {
                this.selectTab(tab.id);
              }}
            >
              ${tab.label}
            </button>
          `,
        )}
      </nav>

      <main class="main" role="tabpanel">${this.renderTabPanel()}</main>

      <footer class="footer">
        <button
          type="button"
          class="footer-btn"
          @click=${() => {
            this.handleOpenOptions();
          }}
        >
          設定
        </button>
        <button
          type="button"
          class="footer-btn"
          @click=${() => {
            this.handleOpenSidePanel();
          }}
        >
          Side Panel
        </button>
        <button
          type="button"
          class="footer-btn"
          @click=${() => {
            this.handleOpenHelp();
          }}
        >
          ヘルプ
        </button>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-popup-root': MarkwellPopupRoot;
  }
}
