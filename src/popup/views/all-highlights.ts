import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { listHighlights } from '../../shared/storage/highlights.js';
import { listTags } from '../../shared/storage/tags.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Tag } from '../../shared/types/tag.js';
import '../components/highlight-card.js';
import { buildHighlightOpenUrl } from '../utils/highlight-url.js';
import { filterHighlights } from '../utils/search.js';

const SEARCH_DEBOUNCE_MS = 200;

@customElement('markwell-all-highlights-view')
export class MarkwellAllHighlightsView extends LitElement {
  @property() searchQuery = '';

  @state() private debouncedQuery = '';

  @state() private results: Highlight[] = [];

  @state() private tagsById: ReadonlyMap<string, Tag> = new Map();

  @state() private loading = true;

  @state() private indexReady = false;

  private allHighlights: Highlight[] = [];

  private debounceTimer: number | undefined;

  static styles = css`
    :host {
      display: block;
    }

    .panel-title {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-tab);
      font-weight: 600;
      color: var(--text-muted);
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
  `;

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

  private applyFilter(): void {
    if (!this.indexReady) {
      return;
    }
    const trimmed = this.debouncedQuery.trim();
    this.results = trimmed === '' ? [] : filterHighlights(this.allHighlights, trimmed);
  }

  private handleRefresh(): void {
    void this.loadIndex();
  }

  private handleOpenHighlight(event: Event): void {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as { highlight?: Highlight };
    if (!detail.highlight) {
      return;
    }
    void chrome.tabs.create({ url: buildHighlightOpenUrl(detail.highlight) });
  }

  render() {
    if (this.loading) {
      return html`
        <h2 class="panel-title">全ページ横断検索</h2>
        <p class="empty">読み込み中…</p>
      `;
    }

    const trimmed = this.debouncedQuery.trim();
    if (trimmed === '') {
      return html`
        <h2 class="panel-title">全ページ横断検索</h2>
        <p class="empty">検索ボックスにキーワードを入力してください</p>
      `;
    }

    if (this.results.length === 0) {
      return html`
        <h2 class="panel-title">全ページ横断検索</h2>
        <p class="empty">「${trimmed}」に一致するハイライトはありません</p>
      `;
    }

    return html`
      <h2 class="panel-title">検索結果 (${this.results.length})</h2>
      <div class="list">
        ${this.results.map(
          (highlight) => html`
            <markwell-highlight-card
              mode="search"
              .highlight=${highlight}
              .tagsById=${this.tagsById}
              @mw-open-highlight=${(event: Event) => {
                this.handleOpenHighlight(event);
              }}
              @mw-refresh=${() => {
                this.handleRefresh();
              }}
            ></markwell-highlight-card>
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
