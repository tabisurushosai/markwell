import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { getCurrentTier } from '../shared/storage/license.js';
import { getSettings, setSettings } from '../shared/storage/settings.js';
import { listProjects } from '../shared/storage/projects.js';
import { listTags } from '../shared/storage/tags.js';
import type { Project } from '../shared/types/project.js';
import type { Tag } from '../shared/types/tag.js';
import type { ThemePreference } from '../shared/types/settings.js';
import {
  applyDocumentTheme,
  nextThemePreference,
  resolveEffectiveTheme,
  themeToggleIcon,
  themeToggleLabel,
} from './utils/theme.js';
import { DEFAULT_DATE_FILTER, type DateFilterValue } from './utils/date-filter.js';
import type { ProjectFilterValue } from './utils/tag-filter.js';
import './components/tag-chips.js';
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

  @state() private tags: Tag[] = [];

  @state() private selectedTagIds: string[] = [];

  @state() private projects: Project[] = [];

  @state() private selectedProjectFilter: ProjectFilterValue = 'all';

  @state() private dateFilter: DateFilterValue = { ...DEFAULT_DATE_FILTER };

  @state() private licenseTier: 'free' | 'trial' | 'premium' = 'free';

  @state() private themePreference: ThemePreference = 'dark';

  private systemThemeQuery: MediaQueryList | null = null;

  static styles = popupStyles;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('mw-toast', this.onToast);
    this.addEventListener('mw-refresh', this.onDataRefresh);
    this.addEventListener('mw-tag-toggle', this.onTagToggle);
    this.addEventListener('mw-project-filter', this.onProjectFilter);
    this.addEventListener('mw-date-filter', this.onDateFilter);
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: light)');
    this.systemThemeQuery.addEventListener('change', this.onSystemThemeChange);
    void this.loadFilterData();
    void this.loadTheme();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('mw-toast', this.onToast);
    this.removeEventListener('mw-refresh', this.onDataRefresh);
    this.removeEventListener('mw-tag-toggle', this.onTagToggle);
    this.removeEventListener('mw-project-filter', this.onProjectFilter);
    this.removeEventListener('mw-date-filter', this.onDateFilter);
    this.systemThemeQuery?.removeEventListener('change', this.onSystemThemeChange);
    this.systemThemeQuery = null;
  }

  private readonly onSystemThemeChange = (): void => {
    if (this.themePreference === 'auto') {
      this.syncThemeToDocument();
    }
  };

  private async loadTheme(): Promise<void> {
    const settings = await getSettings();
    this.themePreference = settings.theme;
    this.syncThemeToDocument();
  }

  private syncThemeToDocument(): void {
    applyDocumentTheme(resolveEffectiveTheme(this.themePreference));
  }

  private async handleThemeToggle(): Promise<void> {
    const next = nextThemePreference(this.themePreference);
    await setSettings({ theme: next });
    this.themePreference = next;
    this.syncThemeToDocument();
  }

  private async loadFilterData(): Promise<void> {
    const [tags, projects, tier] = await Promise.all([
      listTags(),
      listProjects(),
      getCurrentTier(),
    ]);
    this.tags = tags.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    this.projects = projects.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    this.licenseTier = tier;
    this.tier = tier === 'premium' ? 'PREMIUM' : tier === 'trial' ? 'TRIAL' : 'FREE';
  }

  private readonly onDataRefresh = (): void => {
    void this.loadFilterData();
  };

  private readonly onProjectFilter = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const projectFilter = (event.detail as { projectFilter?: ProjectFilterValue }).projectFilter;
    if (projectFilter === undefined) {
      return;
    }
    this.selectedProjectFilter = projectFilter;
  };

  private readonly onDateFilter = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const dateFilter = (event.detail as { dateFilter?: DateFilterValue }).dateFilter;
    if (!dateFilter) {
      return;
    }
    this.dateFilter = dateFilter;
  };

  private readonly onTagToggle = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const tagId = (event.detail as { tagId?: string }).tagId;
    if (typeof tagId !== 'string') {
      return;
    }
    if (this.selectedTagIds.includes(tagId)) {
      this.selectedTagIds = this.selectedTagIds.filter((id) => id !== tagId);
      return;
    }
    this.selectedTagIds = [...this.selectedTagIds, tagId];
  };

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
        return html`
          <markwell-current-page-view
            .selectedTagIds=${this.selectedTagIds}
            .selectedProjectFilter=${this.selectedProjectFilter}
            .dateFilter=${this.dateFilter}
          ></markwell-current-page-view>
        `;
      case 'all':
        return html`
          <markwell-all-highlights-view
            .searchQuery=${this.searchQuery}
            .selectedTagIds=${this.selectedTagIds}
            .selectedProjectFilter=${this.selectedProjectFilter}
            .dateFilter=${this.dateFilter}
          ></markwell-all-highlights-view>
        `;
      case 'projects':
        return html`
          <h2 class="panel-title">プロジェクト</h2>
          ${this.projects.length === 0
            ? html`<p class="placeholder">プロジェクトがありません</p>`
            : html`
                <ul class="project-list">
                  ${this.projects.map(
                    (project) => html`
                      <li class="project-item">
                        <span class="project-name">${project.name}</span>
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
                    `,
                  )}
                </ul>
              `}
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

      <markwell-tag-chips
        .tags=${this.tags}
        .projects=${this.projects}
        .selectedTagIds=${this.selectedTagIds}
        .selectedProjectFilter=${this.selectedProjectFilter}
        .dateFilter=${this.dateFilter}
        .licenseTier=${this.licenseTier}
      ></markwell-tag-chips>

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
          class="footer-btn footer-theme-btn"
          aria-label=${themeToggleLabel(this.themePreference)}
          title=${themeToggleLabel(this.themePreference)}
          @click=${() => {
            void this.handleThemeToggle();
          }}
        >
          ${themeToggleIcon(this.themePreference)}
        </button>
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
          Side Panel を開く
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
