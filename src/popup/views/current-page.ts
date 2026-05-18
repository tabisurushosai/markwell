import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  DEFAULT_DATE_FILTER,
  filterHighlightsByDate,
  type DateFilterValue,
} from '../utils/date-filter.js';
import {
  filterHighlightsByProject,
  filterHighlightsByTagIds,
  type ProjectFilterValue,
} from '../utils/tag-filter.js';

import { listHighlights } from '../../shared/storage/highlights.js';
import { listTags } from '../../shared/storage/tags.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Tag } from '../../shared/types/tag.js';
import '../components/highlight-card.js';
import { getCanonicalUrlForActiveTab } from '../utils/tab-url.js';

@customElement('markwell-current-page-view')
export class MarkwellCurrentPageView extends LitElement {
  @property({ attribute: false }) selectedTagIds: string[] = [];

  @property() selectedProjectFilter: ProjectFilterValue = 'all';

  @property({ attribute: false }) dateFilter: DateFilterValue = { ...DEFAULT_DATE_FILTER };

  @state() private highlights: Highlight[] = [];

  @state() private tagsById: ReadonlyMap<string, Tag> = new Map();

  @state() private loading = true;

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
    void this.loadHighlights();
  }

  private async loadHighlights(): Promise<void> {
    this.loading = true;

    const urlCanonical = await getCanonicalUrlForActiveTab();
    if (urlCanonical === null) {
      this.highlights = [];
      this.tagsById = new Map();
      this.loading = false;
      return;
    }

    const [highlights, tags] = await Promise.all([
      listHighlights({ url_canonical: urlCanonical }),
      listTags(),
    ]);

    this.highlights = highlights;
    this.tagsById = new Map(tags.map((tag) => [tag.id, tag]));
    this.loading = false;
  }

  private handleRefresh(): void {
    void this.loadHighlights();
  }

  private get filteredHighlights(): Highlight[] {
    const byDate = filterHighlightsByDate(this.highlights, this.dateFilter);
    const byProject = filterHighlightsByProject(byDate, this.selectedProjectFilter);
    return filterHighlightsByTagIds(byProject, this.selectedTagIds);
  }

  render() {
    if (this.loading) {
      return html`
        <h2 class="panel-title">このページのハイライト</h2>
        <p class="empty">読み込み中…</p>
      `;
    }

    if (this.highlights.length === 0) {
      return html`
        <h2 class="panel-title">このページのハイライト</h2>
        <p class="empty">
          このページにはまだハイライトがありません。テキストを選択してハイライトしてみましょう。
        </p>
      `;
    }

    const visible = this.filteredHighlights;
    if (visible.length === 0) {
      return html`
        <h2 class="panel-title">このページのハイライト</h2>
        <p class="empty">選択した条件に一致するハイライトはありません</p>
      `;
    }

    return html`
      <h2 class="panel-title">このページのハイライト (${visible.length})</h2>
      <div class="list">
        ${visible.map(
          (highlight) => html`
            <markwell-highlight-card
              .highlight=${highlight}
              .tagsById=${this.tagsById}
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
    'markwell-current-page-view': MarkwellCurrentPageView;
  }
}
