import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { popupStyles } from './styles.js';
import './views/all-highlights.js';
import './views/current-page.js';

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

  @state() private toastMessage = '';

  static styles = popupStyles;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('mw-toast', this.onToast);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('mw-toast', this.onToast);
  }

  private readonly onToast = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as { message?: string };
    const message = detail.message ?? '';
    if (message === '') {
      return;
    }
    this.toastMessage = message;
    window.setTimeout(() => {
      this.toastMessage = '';
    }, 3000);
  };

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
        return html`<markwell-current-page-view></markwell-current-page-view>`;
      case 'all':
        return html`
          <markwell-all-highlights-view .searchQuery=${this.searchQuery}></markwell-all-highlights-view>
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

      ${this.toastMessage
        ? html`<div class="toast" role="status">${this.toastMessage}</div>`
        : ''}

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
