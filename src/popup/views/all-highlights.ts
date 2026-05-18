import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { listHighlights } from '../../shared/storage/highlights.js';
import { listTags } from '../../shared/storage/tags.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Project } from '../../shared/types/project.js';
import type { Tag } from '../../shared/types/tag.js';
import '../components/highlight-card.js';
import { openDeleteConfirmDialog } from '../delete-confirm-dialog.js';
import {
  bulkAddHighlightsToProject,
  bulkAddTagsToHighlights,
  bulkDeleteHighlights,
} from '../utils/bulk-highlight-operations.js';
import { buildHighlightOpenUrl } from '../utils/highlight-url.js';
import { type DateFilterValue, DEFAULT_DATE_FILTER, isDateFilterActive } from '../utils/date-filter.js';
import { applyHighlightFilters, isProjectFilterActive, type ProjectFilterValue } from '../utils/tag-filter.js';
import { accessibilityStyles } from '../../shared/styles/accessibility.js';
import { dispatchToast, type ToastKind } from '../../shared/components/toast.js';
import { t } from '../../shared/utils/i18n.js';
import { popupDesignTokens } from '../styles.js';

const SEARCH_DEBOUNCE_MS = 200;

type BulkPanel = 'none' | 'project' | 'tags';

@customElement('markwell-all-highlights-view')
export class MarkwellAllHighlightsView extends LitElement {
  @property() searchQuery = '';

  @property({ attribute: false }) selectedTagIds: string[] = [];

  @property() selectedProjectFilter: ProjectFilterValue = 'all';

  @property({ attribute: false }) dateFilter: DateFilterValue = { ...DEFAULT_DATE_FILTER };

  @property({ type: Number }) focusedCardIndex = -1;

  @property() licenseTier: 'free' | 'trial' | 'premium' = 'free';

  @property() translateTargetLang = 'ja';

  @property({ attribute: false }) projects: Project[] = [];

  @state() private debouncedQuery = '';

  @state() private results: Highlight[] = [];

  @state() private tagsById: ReadonlyMap<string, Tag> = new Map();

  @state() private loading = true;

  @state() private indexReady = false;

  @state() private selectionMode = false;

  @state() private selectedHighlightIds: string[] = [];

  @state() private bulkPanel: BulkPanel = 'none';

  @state() private bulkProjectId = '';

  @state() private bulkTagIds: string[] = [];

  @state() private bulkWorking = false;

  private allHighlights: Highlight[] = [];

  private debounceTimer: number | undefined;

  static styles = [
    popupDesignTokens,
    accessibilityStyles,
    css`
      :host {
        display: block;
      }

      .panel-title {
        margin: 0 0 var(--space-2);
        font-size: var(--font-size-tab);
        font-weight: 600;
        color: var(--text-muted);
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        align-items: center;
        margin-bottom: var(--space-3);
      }

      .toolbar-meta {
        font-size: var(--font-size-sm);
        color: var(--text-muted);
      }

      .btn {
        padding: 6px 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--surface);
        color: var(--text);
        font-family: inherit;
        font-size: var(--font-size-sm);
        cursor: pointer;
      }

      .btn:hover:not(:disabled) {
        border-color: var(--accent);
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn--active {
        border-color: var(--accent);
        color: var(--accent);
      }

      .btn--danger {
        border-color: #8b3a3a;
        color: #f0a0a0;
      }

      .bulk-bar {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        margin-bottom: var(--space-3);
        padding: var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
      }

      .bulk-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .bulk-panel {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding-top: var(--space-2);
        border-top: 1px solid var(--border);
      }

      .bulk-panel__row {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        align-items: center;
      }

      .bulk-select {
        min-width: 180px;
        padding: 6px 8px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--bg);
        color: var(--text);
        font-family: inherit;
        font-size: var(--font-size-sm);
      }

      .tag-options {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }

      .tag-option {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--bg);
        font-size: var(--font-size-sm);
        cursor: pointer;
      }

      .tag-option--selected {
        border-color: var(--accent);
        color: var(--accent);
      }

      .tag-option input {
        margin: 0;
      }

      .empty {
        margin: 0;
        padding: var(--space-5) var(--space-3);
        text-align: center;
        color: var(--text-muted);
        line-height: 1.6;
        border: 1px dashed var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
      }

      .list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .select-row {
        display: flex;
        gap: var(--space-2);
        align-items: flex-start;
      }

      .select-row__checkbox {
        flex-shrink: 0;
        margin-top: 14px;
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .select-row__card {
        flex: 1;
        min-width: 0;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    void this.loadIndex();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.debounceTimer !== undefined) {
      window.clearTimeout(this.debounceTimer);
    }
  }

  updated(changed: Map<string, unknown>): void {
    if (
      changed.has('selectedTagIds') ||
      changed.has('selectedProjectFilter') ||
      changed.has('dateFilter')
    ) {
      this.applyFilter();
    }
    if (changed.has('searchQuery')) {
      if (this.debounceTimer !== undefined) {
        window.clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = window.setTimeout(() => {
        this.debouncedQuery = this.searchQuery;
        this.applyFilter();
      }, SEARCH_DEBOUNCE_MS);
    }
  }

  private async loadIndex(): Promise<void> {
    this.loading = true;
    const [highlights, tags] = await Promise.all([listHighlights(), listTags()]);
    this.allHighlights = highlights.sort((a, b) => b.created_at - a.created_at);
    this.tagsById = new Map(tags.map((tag) => [tag.id, tag]));
    this.indexReady = true;
    this.debouncedQuery = this.searchQuery;
    this.applyFilter();
    this.loading = false;
  }

  private hasActiveFilter(): boolean {
    return (
      this.debouncedQuery.trim() !== '' ||
      this.selectedTagIds.length > 0 ||
      isProjectFilterActive(this.selectedProjectFilter) ||
      isDateFilterActive(this.dateFilter)
    );
  }

  private applyFilter(): void {
    if (!this.indexReady) {
      return;
    }
    if (!this.hasActiveFilter()) {
      this.results = [];
      this.pruneSelection();
      return;
    }
    this.results = applyHighlightFilters(this.allHighlights, {
      searchQuery: this.debouncedQuery,
      tagIds: this.selectedTagIds,
      projectFilter: this.selectedProjectFilter,
      dateFilter: this.dateFilter,
    });
    this.pruneSelection();
  }

  private pruneSelection(): void {
    const visibleIds = new Set(this.results.map((highlight) => highlight.id));
    this.selectedHighlightIds = this.selectedHighlightIds.filter((id) => visibleIds.has(id));
  }

  private get selectedCount(): number {
    return this.selectedHighlightIds.length;
  }

  private get allVisibleSelected(): boolean {
    return this.results.length > 0 && this.results.every((highlight) => this.isSelected(highlight.id));
  }

  private isSelected(highlightId: string): boolean {
    return this.selectedHighlightIds.includes(highlightId);
  }

  private toggleSelectionMode(): void {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.clearSelection();
    }
    this.bulkPanel = 'none';
  }

  private clearSelection(): void {
    this.selectedHighlightIds = [];
    this.bulkPanel = 'none';
    this.bulkProjectId = '';
    this.bulkTagIds = [];
  }

  private toggleHighlightSelection(highlightId: string): void {
    if (this.isSelected(highlightId)) {
      this.selectedHighlightIds = this.selectedHighlightIds.filter((id) => id !== highlightId);
      return;
    }
    this.selectedHighlightIds = [...this.selectedHighlightIds, highlightId];
  }

  private toggleSelectAllVisible(): void {
    if (this.allVisibleSelected) {
      const visibleIds = new Set(this.results.map((highlight) => highlight.id));
      this.selectedHighlightIds = this.selectedHighlightIds.filter((id) => !visibleIds.has(id));
      return;
    }
    const merged = new Set(this.selectedHighlightIds);
    for (const highlight of this.results) {
      merged.add(highlight.id);
    }
    this.selectedHighlightIds = [...merged];
  }

  private openBulkPanel(panel: BulkPanel): void {
    if (this.selectedCount === 0) {
      return;
    }
    this.bulkPanel = panel;
    if (panel === 'project' && this.bulkProjectId === '' && this.projects.length > 0) {
      this.bulkProjectId = this.projects[0]?.id ?? '';
    }
  }

  private toggleBulkTag(tagId: string): void {
    if (this.bulkTagIds.includes(tagId)) {
      this.bulkTagIds = this.bulkTagIds.filter((id) => id !== tagId);
      return;
    }
    this.bulkTagIds = [...this.bulkTagIds, tagId];
  }

  private dispatchToast(message: string, kind: ToastKind = 'success'): void {
    dispatchToast(this, message, kind);
  }

  private dispatchRefresh(): void {
    this.dispatchEvent(
      new CustomEvent('mw-refresh', { bubbles: true, composed: true }),
    );
  }

  private handleRefresh(): void {
    void this.loadIndex();
  }

  private async handleBulkAddToProject(): Promise<void> {
    if (this.bulkProjectId === '' || this.selectedCount === 0 || this.bulkWorking) {
      return;
    }

    this.bulkWorking = true;
    try {
      const count = await bulkAddHighlightsToProject(this.selectedHighlightIds, this.bulkProjectId);
      this.clearSelection();
      this.selectionMode = false;
      await this.loadIndex();
      this.dispatchRefresh();
      this.dispatchToast(`${String(count)} 件をプロジェクトに追加しました`);
    } catch {
      this.dispatchToast('プロジェクトへの追加に失敗しました', 'error');
    } finally {
      this.bulkWorking = false;
    }
  }

  private async handleBulkAddTags(): Promise<void> {
    if (this.bulkTagIds.length === 0 || this.selectedCount === 0 || this.bulkWorking) {
      return;
    }

    this.bulkWorking = true;
    try {
      const count = await bulkAddTagsToHighlights(this.selectedHighlightIds, this.bulkTagIds);
      this.clearSelection();
      this.selectionMode = false;
      await this.loadIndex();
      this.dispatchRefresh();
      this.dispatchToast(`${String(count)} 件にタグを追加しました`);
    } catch {
      this.dispatchToast('タグの追加に失敗しました', 'error');
    } finally {
      this.bulkWorking = false;
    }
  }

  private handleBulkDelete(): void {
    if (this.selectedCount === 0 || this.bulkWorking) {
      return;
    }

    const selectedHighlights = this.results.filter((highlight) =>
      this.selectedHighlightIds.includes(highlight.id),
    );
    const count = selectedHighlights.length;
    openDeleteConfirmDialog({
      message: `選択した ${String(count)} 件のハイライトを削除しますか？この操作は取り消せません。`,
      onConfirm: async () => {
        this.bulkWorking = true;
        try {
          const deleted = await bulkDeleteHighlights(selectedHighlights);
          this.clearSelection();
          this.selectionMode = false;
          await this.loadIndex();
          this.dispatchRefresh();
          this.dispatchToast(`${String(deleted)} 件を削除しました`);
        } catch {
          this.dispatchToast('削除に失敗しました', 'error');
        } finally {
          this.bulkWorking = false;
        }
      },
    });
  }

  private handleOpenHighlight(event: Event): void {
    if (this.selectionMode) {
      return;
    }
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as { highlight?: Highlight };
    if (!detail.highlight) {
      return;
    }
    void chrome.tabs.create({ url: buildHighlightOpenUrl(detail.highlight) });
  }

  private renderToolbar() {
    return html`
      <div class="toolbar">
        <button
          type="button"
          class="btn ${this.selectionMode ? 'btn--active' : ''}"
          aria-label=${this.selectionMode ? '選択を終了' : '複数選択'}
          @click=${() => {
            this.toggleSelectionMode();
          }}
        >
          ${this.selectionMode ? '選択を終了' : '複数選択'}
        </button>
        ${this.selectionMode
          ? html`
              <button
                type="button"
                class="btn"
                aria-label=${this.allVisibleSelected ? '表示分の選択を解除' : '表示分をすべて選択'}
                ?disabled=${this.results.length === 0}
                @click=${() => {
                  this.toggleSelectAllVisible();
                }}
              >
                ${this.allVisibleSelected ? '表示分の選択を解除' : '表示分をすべて選択'}
              </button>
              <span class="toolbar-meta">${String(this.selectedCount)} 件選択中</span>
            `
          : nothing}
      </div>
    `;
  }

  private renderBulkBar() {
    if (!this.selectionMode || this.selectedCount === 0) {
      return nothing;
    }

    const tags = [...this.tagsById.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'));

    return html`
      <div class="bulk-bar">
        <div class="bulk-actions">
          <button
            type="button"
            class="btn"
            aria-label="プロジェクトに追加"
            ?disabled=${this.bulkWorking || this.projects.length === 0}
            @click=${() => {
              this.openBulkPanel('project');
            }}
          >
            プロジェクトに追加
          </button>
          <button
            type="button"
            class="btn"
            aria-label="タグ追加"
            ?disabled=${this.bulkWorking || tags.length === 0}
            @click=${() => {
              this.openBulkPanel('tags');
            }}
          >
            タグ追加
          </button>
          <button
            type="button"
            class="btn btn--danger"
            aria-label="削除"
            ?disabled=${this.bulkWorking}
            @click=${() => {
              this.handleBulkDelete();
            }}
          >
            削除
          </button>
        </div>

        ${this.bulkPanel === 'project'
          ? html`
              <div class="bulk-panel">
                <div class="bulk-panel__row">
                  <label>
                    <span class="toolbar-meta">プロジェクト</span>
                    <select
                      class="bulk-select"
                      .value=${this.bulkProjectId}
                      @change=${(event: Event) => {
                        const select = event.target;
                        if (select instanceof HTMLSelectElement) {
                          this.bulkProjectId = select.value;
                        }
                      }}
                    >
                      ${this.projects.map(
                        (project) => html`
                          <option value=${project.id}>${project.cover_emoji} ${project.name}</option>
                        `,
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    class="btn"
                    aria-label="追加する"
                    ?disabled=${this.bulkWorking || this.bulkProjectId === ''}
                    @click=${() => {
                      void this.handleBulkAddToProject();
                    }}
                  >
                    追加する
                  </button>
                  <button
                    type="button"
                    class="btn"
                    aria-label="キャンセル"
                    @click=${() => {
                      this.bulkPanel = 'none';
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            `
          : nothing}

        ${this.bulkPanel === 'tags'
          ? html`
              <div class="bulk-panel">
                <div class="tag-options">
                  ${tags.map((tag) => {
                    const selected = this.bulkTagIds.includes(tag.id);
                    return html`
                      <label class="tag-option ${selected ? 'tag-option--selected' : ''}">
                        <input
                          type="checkbox"
                          .checked=${selected}
                          @change=${() => {
                            this.toggleBulkTag(tag.id);
                          }}
                        />
                        <span style="color: ${tag.color}">●</span>
                        ${tag.name}
                      </label>
                    `;
                  })}
                </div>
                <div class="bulk-panel__row">
                  <button
                    type="button"
                    class="btn"
                    aria-label="タグを追加"
                    ?disabled=${this.bulkWorking || this.bulkTagIds.length === 0}
                    @click=${() => {
                      void this.handleBulkAddTags();
                    }}
                  >
                    タグを追加
                  </button>
                  <button
                    type="button"
                    class="btn"
                    aria-label="キャンセル"
                    @click=${() => {
                      this.bulkPanel = 'none';
                      this.bulkTagIds = [];
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`
        <h2 class="panel-title">全ページ横断検索</h2>
        <p class="empty">読み込み中…</p>
      `;
    }

    if (!this.hasActiveFilter()) {
      return html`
        <h2 class="panel-title">全ページ横断検索</h2>
        <p class="empty">検索・タグ・プロジェクト・日付のいずれかで絞り込んでください</p>
      `;
    }

    if (this.results.length === 0) {
      return html`
        <h2 class="panel-title">全ページ横断検索</h2>
        <p class="empty">${t('popup_empty_all')}</p>
      `;
    }

    return html`
      <h2 class="panel-title">検索結果 (${this.results.length})</h2>
      ${this.renderToolbar()}
      ${this.renderBulkBar()}
      <div class="list">
        ${this.results.map(
          (highlight, index) => html`
            <div class="select-row">
              ${this.selectionMode
                ? html`
                    <input
                      class="select-row__checkbox"
                      type="checkbox"
                      .checked=${this.isSelected(highlight.id)}
                      aria-label="ハイライトを選択"
                      @change=${() => {
                        this.toggleHighlightSelection(highlight.id);
                      }}
                    />
                  `
                : nothing}
              <div class="select-row__card">
                <markwell-highlight-card
                  mode="search"
                  .highlight=${highlight}
                  .tagsById=${this.tagsById}
                  .licenseTier=${this.licenseTier}
                  .translateTargetLang=${this.translateTargetLang}
                  ?keyboard-focused=${!this.selectionMode && index === this.focusedCardIndex}
                  @mw-open-highlight=${(event: Event) => {
                    this.handleOpenHighlight(event);
                  }}
                  @mw-refresh=${() => {
                    this.handleRefresh();
                  }}
                ></markwell-highlight-card>
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-all-highlights-view': MarkwellAllHighlightsView;
  }
}
