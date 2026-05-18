import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { popupStyles } from './styles.js';

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

  static styles = popupStyles;

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
