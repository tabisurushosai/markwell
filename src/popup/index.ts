import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { findRelatedHighlights } from '../shared/ai/related-highlights.js';
import { AiAccessError } from '../shared/license/ai-access.js';
import {
  formatTrialRemainingLabel,
  getTrialDaysRemaining,
  isTrialUrgent,
} from '../shared/license/trial-countdown.js';
import { getCurrentTier, getLicenseStatus } from '../shared/storage/license.js';
import { getSettings, setSettings } from '../shared/storage/settings.js';
import { listProjects } from '../shared/storage/projects.js';
import { listTags } from '../shared/storage/tags.js';
import type { Highlight } from '../shared/types/highlight.js';
import { buildHighlightOpenUrl } from './utils/highlight-url.js';
import type { Project } from '../shared/types/project.js';
import type { Tag } from '../shared/types/tag.js';
import type { ThemePreference } from '../shared/types/settings.js';
import {
  nextThemePreference,
  themeToggleIcon,
  themeToggleLabel,
} from './utils/theme.js';
import { applyUiPreferences } from './utils/ui-preferences.js';
import { DEFAULT_DATE_FILTER, type DateFilterValue } from './utils/date-filter.js';
import type { ProjectFilterValue } from './utils/tag-filter.js';
import './components/tag-chips.js';
import { MarkwellHighlightCard } from './components/highlight-card.js';
import {
  clampIndex,
  isEditableElement,
  shouldCycleViewTabs,
} from './utils/keyboard-navigation.js';
import '../shared/ui/tier-badge.js';
import '../shared/ui/premium-dialog.js';
import type { AiFeature } from '../shared/license/ai-access.js';
import type { PremiumDialogMode } from '../shared/ui/premium-dialog.js';
import { popupStyles } from './styles.js';
import './views/all-highlights.js';
import './views/current-page.js';

type TabId = 'page' | 'all' | 'projects';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'page', label: '現在のページ' },
  { id: 'all', label: 'すべて' },
  { id: 'projects', label: 'プロジェクト' },
];

const TAB_IDS: TabId[] = ['page', 'all', 'projects'];

@customElement('markwell-popup-root')
export class MarkwellPopupRoot extends LitElement {
  @state() private activeTab: TabId = 'page';
  @state() private searchQuery = '';
  @state() private trialRemainingLabel = '';

  @state() private trialUrgent = false;

  @state() private premiumDialogOpen = false;

  @state() private premiumDialogMode: PremiumDialogMode = 'purchase';

  @state() private premiumHighlightFeature: AiFeature | null = null;

  @state() private toastMessage = '';

  @state() private tags: Tag[] = [];

  @state() private selectedTagIds: string[] = [];

  @state() private projects: Project[] = [];

  @state() private selectedProjectFilter: ProjectFilterValue = 'all';

  @state() private dateFilter: DateFilterValue = { ...DEFAULT_DATE_FILTER };

  @state() private licenseTier: 'free' | 'trial' | 'premium' = 'free';

  @state() private translateTargetLang = 'ja';

  @state() private themePreference: ThemePreference = 'dark';

  @state() private focusedCardIndex = -1;

  @state() private relatedLoading = false;

  @state() private relatedSource: Highlight | null = null;

  @state() private relatedHighlights: Highlight[] = [];

  @state() private relatedTagsById: ReadonlyMap<string, Tag> = new Map();

  private systemThemeQuery: MediaQueryList | null = null;

  static styles = popupStyles;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('mw-toast', this.onToast);
    this.addEventListener('mw-refresh', this.onDataRefresh);
    this.addEventListener('mw-tag-toggle', this.onTagToggle);
    this.addEventListener('mw-project-filter', this.onProjectFilter);
    this.addEventListener('mw-date-filter', this.onDateFilter);
    this.addEventListener('mw-find-related', this.onFindRelated);
    this.addEventListener('mw-open-highlight', this.onOpenHighlightFromRelated);
    this.addEventListener('mw-tier-badge-click', this.onTierBadgeClick);
    this.addEventListener('mw-premium-unlock', this.onPremiumUnlock);
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: light)');
    this.systemThemeQuery.addEventListener('change', this.onSystemThemeChange);
    window.addEventListener('keydown', this.onKeyDown, true);
    void this.loadFilterData();
    void this.loadTheme();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKeyDown, true);
    this.removeEventListener('mw-toast', this.onToast);
    this.removeEventListener('mw-refresh', this.onDataRefresh);
    this.removeEventListener('mw-tag-toggle', this.onTagToggle);
    this.removeEventListener('mw-project-filter', this.onProjectFilter);
    this.removeEventListener('mw-date-filter', this.onDateFilter);
    this.removeEventListener('mw-find-related', this.onFindRelated);
    this.removeEventListener('mw-open-highlight', this.onOpenHighlightFromRelated);
    this.removeEventListener('mw-tier-badge-click', this.onTierBadgeClick);
    this.removeEventListener('mw-premium-unlock', this.onPremiumUnlock);
    this.systemThemeQuery?.removeEventListener('change', this.onSystemThemeChange);
    this.systemThemeQuery = null;
  }

  private readonly onSystemThemeChange = (): void => {
    if (this.themePreference === 'auto') {
      void this.syncThemeToDocument();
    }
  };

  private async loadTheme(): Promise<void> {
    const settings = await getSettings();
    this.themePreference = settings.theme;
    await this.syncThemeToDocument();
  }

  private async syncThemeToDocument(): Promise<void> {
    const settings = await getSettings();
    applyUiPreferences({
      theme: this.themePreference,
      font_scale: settings.font_scale,
      density: settings.density,
    });
  }

  private async handleThemeToggle(): Promise<void> {
    const next = nextThemePreference(this.themePreference);
    const settings = await setSettings({ theme: next });
    this.themePreference = next;
    applyUiPreferences(settings);
  }

  private async loadFilterData(): Promise<void> {
    const [tags, projects, tier, license, settings] = await Promise.all([
      listTags(),
      listProjects(),
      getCurrentTier(),
      getLicenseStatus(),
      getSettings(),
    ]);
    this.tags = tags.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    this.projects = projects.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    this.licenseTier = tier;
    this.translateTargetLang = settings.translate_target_lang;
    if (tier === 'trial' && license.trial_end !== null) {
      const days = getTrialDaysRemaining(license.trial_end);
      this.trialRemainingLabel = formatTrialRemainingLabel(days);
      this.trialUrgent = isTrialUrgent(days);
    } else {
      this.trialRemainingLabel = '';
      this.trialUrgent = false;
    }
  }

  private readonly onDataRefresh = (): void => {
    void this.loadFilterData();
    this.clampFocusedCardIndex();
  };

  protected firstUpdated(): void {
    const search = this.renderRoot.querySelector('.search');
    if (search instanceof HTMLInputElement) {
      search.focus();
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('activeTab') && this.activeTab === 'projects') {
      this.focusedCardIndex = -1;
    }
    if (
      changed.has('searchQuery') ||
      changed.has('selectedTagIds') ||
      changed.has('selectedProjectFilter') ||
      changed.has('dateFilter')
    ) {
      this.clampFocusedCardIndex();
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      window.close();
      return;
    }

    if (event.key === 'Tab' && shouldCycleViewTabs(event.target)) {
      event.preventDefault();
      this.cycleViewTab(event.shiftKey ? -1 : 1);
      return;
    }

    if (isEditableElement(event.target)) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (this.activeTab === 'projects') {
        return;
      }
      event.preventDefault();
      this.moveCardFocus(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (this.focusedCardIndex < 0) {
      return;
    }

    const card = this.getFocusedCard();
    if (card === null) {
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void card.jump();
      return;
    }

    if (event.key === 'c' || event.key === 'C') {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      event.preventDefault();
      void card.copyPlain();
      return;
    }

    if (event.key === 'd' || event.key === 'D') {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      event.preventDefault();
      void card.deleteWithConfirm();
    }
  };

  private getHighlightCards(): MarkwellHighlightCard[] {
    const panel = this.renderRoot.querySelector('.main');
    if (panel === null) {
      return [];
    }
    const view = panel.querySelector('markwell-current-page-view, markwell-all-highlights-view');
    if (view === null || view.shadowRoot === null) {
      return [];
    }
    const list = view.shadowRoot.querySelector('.list');
    if (list === null) {
      return [];
    }
    return Array.from(list.querySelectorAll('markwell-highlight-card')).filter(
      (node): node is MarkwellHighlightCard => node instanceof MarkwellHighlightCard,
    );
  }

  private getFocusedCard(): MarkwellHighlightCard | null {
    const cards = this.getHighlightCards();
    if (this.focusedCardIndex < 0 || this.focusedCardIndex >= cards.length) {
      return null;
    }
    return cards[this.focusedCardIndex] ?? null;
  }

  private clampFocusedCardIndex(): void {
    const count = this.getHighlightCards().length;
    this.focusedCardIndex = clampIndex(this.focusedCardIndex, count);
  }

  private moveCardFocus(delta: number): void {
    const cards = this.getHighlightCards();
    if (cards.length === 0) {
      this.focusedCardIndex = -1;
      return;
    }
    if (this.focusedCardIndex < 0) {
      this.focusedCardIndex = delta > 0 ? 0 : cards.length - 1;
    } else {
      this.focusedCardIndex =
        (this.focusedCardIndex + delta + cards.length) % cards.length;
    }
    cards[this.focusedCardIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  private cycleViewTab(direction: -1 | 1): void {
    const index = TAB_IDS.indexOf(this.activeTab);
    const next = TAB_IDS[(index + direction + TAB_IDS.length) % TAB_IDS.length];
    this.selectTab(next);
    this.focusedCardIndex = -1;
  }

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

  private showToast(message: string): void {
    if (message === '') {
      return;
    }
    this.toastMessage = message;
    window.setTimeout(() => {
      this.toastMessage = '';
    }, 3000);
  }

  private readonly onToast = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as { message?: string };
    this.showToast(detail.message ?? '');
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
    if (tabId === 'projects') {
      this.focusedCardIndex = -1;
    }
  }

  private renderTabPanel() {
    switch (this.activeTab) {
      case 'page':
        return html`
          <markwell-current-page-view
            .selectedTagIds=${this.selectedTagIds}
            .selectedProjectFilter=${this.selectedProjectFilter}
            .dateFilter=${this.dateFilter}
            .focusedCardIndex=${this.focusedCardIndex}
            .licenseTier=${this.licenseTier}
            .translateTargetLang=${this.translateTargetLang}
          ></markwell-current-page-view>
        `;
      case 'all':
        return html`
          <markwell-all-highlights-view
            .searchQuery=${this.searchQuery}
            .selectedTagIds=${this.selectedTagIds}
            .selectedProjectFilter=${this.selectedProjectFilter}
            .dateFilter=${this.dateFilter}
            .focusedCardIndex=${this.focusedCardIndex}
            .licenseTier=${this.licenseTier}
            .translateTargetLang=${this.translateTargetLang}
            .projects=${this.projects}
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

  private readonly onTierBadgeClick = (): void => {
    this.openPurchaseModal();
  };

  private readonly onPremiumUnlock = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const feature = (event.detail as { feature?: AiFeature }).feature;
    this.openUnlockModal(feature ?? null);
  };

  private openPurchaseModal(): void {
    this.premiumDialogMode = 'purchase';
    this.premiumHighlightFeature = null;
    this.premiumDialogOpen = true;
  }

  private openUnlockModal(feature: AiFeature | null): void {
    this.premiumDialogMode = 'unlock';
    this.premiumHighlightFeature = feature;
    this.premiumDialogOpen = true;
  }

  private closePremiumDialog(): void {
    this.premiumDialogOpen = false;
    this.premiumHighlightFeature = null;
  }

  private handleOpenSidePanel(): void {
    void (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs[0]?.id;
      if (tabId === undefined) {
        return;
      }
      await chrome.sidePanel.open({ tabId });
    })();
  }

  private handleOpenHelp(): void {
    void chrome.tabs.create({ url: 'https://github.com/markwell' });
  }

  private readonly onFindRelated = (event: Event): void => {
    const custom = event as CustomEvent<{ highlight: Highlight }>;
    void this.loadRelatedHighlights(custom.detail.highlight);
  };

  private readonly onOpenHighlightFromRelated = (event: Event): void => {
    const custom = event as CustomEvent<{ highlight: Highlight }>;
    void chrome.tabs.create({ url: buildHighlightOpenUrl(custom.detail.highlight) });
  };

  private async loadRelatedHighlights(source: Highlight): Promise<void> {
    this.relatedSource = source;
    this.relatedLoading = true;
    this.relatedHighlights = [];

    try {
      const [related, tags] = await Promise.all([findRelatedHighlights(source), listTags()]);
      this.relatedHighlights = related;
      this.relatedTagsById = new Map(tags.map((tag) => [tag.id, tag]));
      if (related.length === 0) {
        this.showToast('関連ハイライトが見つかりませんでした');
      }
    } catch (error) {
      this.relatedHighlights = [];
      if (error instanceof AiAccessError) {
        this.showToast('関連ハイライトはトライアルまたは Premium で利用できます');
      } else {
        this.showToast('関連ハイライトの取得に失敗しました');
      }
    } finally {
      this.relatedLoading = false;
    }
  }

  private closeRelatedSection(): void {
    this.relatedSource = null;
    this.relatedHighlights = [];
    this.relatedLoading = false;
  }

  private renderRelatedSection() {
    if (this.relatedSource === null && !this.relatedLoading) {
      return nothing;
    }

    const preview =
      this.relatedSource !== null
        ? this.relatedSource.selected_text.slice(0, 48) +
          (this.relatedSource.selected_text.length > 48 ? '…' : '')
        : '';

    return html`
      <section class="related-section" aria-label="関連ハイライト">
        <div class="related-section__header">
          <div>
            <h2 class="related-section__title">関連ハイライト</h2>
            ${preview !== ''
              ? html`<p class="related-section__source">「${preview}」に近い候補</p>`
              : nothing}
          </div>
          <button
            type="button"
            class="related-section__close"
            aria-label="関連ハイライトを閉じる"
            @click=${() => {
              this.closeRelatedSection();
            }}
          >
            閉じる
          </button>
        </div>
        ${this.relatedLoading
          ? html`<p class="related-section__status">関連を検索中…</p>`
          : this.relatedHighlights.length === 0
            ? html`<p class="related-section__status">表示できる関連ハイライトがありません</p>`
            : html`
                <div class="related-section__list">
                  ${this.relatedHighlights.map(
                    (highlight) => html`
                      <markwell-highlight-card
                        mode="search"
                        .highlight=${highlight}
                        .tagsById=${this.relatedTagsById}
                        .licenseTier=${this.licenseTier}
                        .translateTargetLang=${this.translateTargetLang}
                        ?show-related-action=${false}
                      ></markwell-highlight-card>
                    `,
                  )}
                </div>
              `}
      </section>
    `;
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
        <mw-tier-badge
          .tier=${this.licenseTier}
          .trialRemainingLabel=${this.trialRemainingLabel}
          ?trialUrgent=${this.trialUrgent}
        ></mw-tier-badge>
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

      ${this.renderRelatedSection()}

      ${this.toastMessage
        ? html`<div class="toast" role="status">${this.toastMessage}</div>`
        : ''}

      <mw-premium-dialog
        .open=${this.premiumDialogOpen}
        .mode=${this.premiumDialogMode}
        .highlightFeature=${this.premiumHighlightFeature}
        @mw-close=${() => {
          this.closePremiumDialog();
        }}
      ></mw-premium-dialog>

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
