import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { deleteHighlight } from '../../shared/storage/highlights.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Tag } from '../../shared/types/tag.js';
import { notifyHighlightRemovedOnOpenTabs } from '../utils/notify-highlight-removed.js';
import { formatRelativeTime } from '../utils/relative-time.js';
import { isJumpToHighlightResponse } from '../utils/jump.js';
import { popupDesignTokens } from '../styles.js';
import { getActiveTabId } from '../utils/tab-url.js';

const DELETE_CONFIRM_MESSAGE =
  'このハイライトを削除しますか？この操作は取り消せません。';

const COLOR_VAR: Record<Highlight['color'], string> = {
  yellow: 'var(--hl-yellow)',
  green: 'var(--hl-green)',
  pink: 'var(--hl-pink)',
  blue: 'var(--hl-blue)',
  orange: 'var(--hl-orange)',
};

@customElement('markwell-highlight-card')
export class MarkwellHighlightCard extends LitElement {
  @property({ attribute: false }) highlight!: Highlight;

  @property({ attribute: false }) tagsById: ReadonlyMap<string, Tag> = new Map();

  @property({ reflect: true }) mode: 'page' | 'search' = 'page';

  static styles = [
    popupDesignTokens,
    css`
    :host {
      display: block;
    }

    .card {
      display: flex;
      gap: var(--space-2);
      padding: var(--space-3);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }

    .marker {
      flex-shrink: 0;
      width: 4px;
      border-radius: var(--radius-sm);
      align-self: stretch;
    }

    .body {
      flex: 1;
      min-width: 0;
    }

    .card--search {
      cursor: pointer;
    }

    .card--search:hover {
      border-color: var(--accent);
    }

    .source {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      line-height: 1.35;
    }

    .source .page-title {
      display: block;
      color: var(--text);
      font-weight: 500;
    }

    .source .domain {
      display: block;
      margin-top: 2px;
    }

    .text {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-base);
      line-height: 1.45;
      color: var(--text);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1);
      margin-bottom: var(--space-2);
    }

    .tag {
      padding: 2px var(--space-1);
      border-radius: var(--radius-sm);
      font-size: 10px;
      font-weight: 600;
      background: var(--surface-raised);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .note-icon {
      font-size: 12px;
      line-height: 1;
      color: var(--accent);
    }

    .time {
      margin-left: auto;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .actions {
      display: flex;
      gap: var(--space-1);
    }

    .action-btn {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      color: var(--text-muted);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .action-btn:hover {
      color: var(--text);
      border-color: var(--accent);
    }

    .action-btn--danger:hover {
      border-color: #e57373;
      color: #e57373;
    }

    .action-btn--icon {
      min-width: 32px;
      padding: var(--space-1);
      font-size: 14px;
      line-height: 1;
    }
  `,
  ];

  private dispatchRefresh(): void {
    this.dispatchEvent(
      new CustomEvent('mw-refresh', { bubbles: true, composed: true }),
    );
  }

  private showToast(message: string): void {
    this.dispatchEvent(
      new CustomEvent('mw-toast', {
        bubbles: true,
        composed: true,
        detail: { message },
      }),
    );
  }

  private async handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(this.highlight.selected_text);
    this.showToast('コピーしました');
  }

  private async handleDelete(): Promise<void> {
    if (!window.confirm(DELETE_CONFIRM_MESSAGE)) {
      return;
    }
    const highlight = this.highlight;
    await deleteHighlight(highlight.id);
    await notifyHighlightRemovedOnOpenTabs(highlight);
    this.dispatchRefresh();
  }

  private showJumpNotFoundToast(): void {
    this.showToast('ハイライトが見つかりません');
  }

  private handleCardClick(event: Event): void {
    if (this.mode !== 'search') {
      return;
    }
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent('mw-open-highlight', {
        bubbles: true,
        composed: true,
        detail: { highlight: this.highlight },
      }),
    );
  }

  private async handleJump(): Promise<void> {
    const tabId = await getActiveTabId();
    if (tabId === null) {
      this.showJumpNotFoundToast();
      return;
    }

    try {
      const response: unknown = await chrome.tabs.sendMessage(tabId, {
        type: 'JUMP_TO_HIGHLIGHT',
        id: this.highlight.id,
      });
      if (!isJumpToHighlightResponse(response) || !response.ok) {
        this.showJumpNotFoundToast();
      }
    } catch {
      this.showJumpNotFoundToast();
    }
  }

  render() {
    const markerColor = COLOR_VAR[this.highlight.color];
    const hasNote = this.highlight.note.trim() !== '';
    const isSearch = this.mode === 'search';

    return html`
      <article
        class="card ${isSearch ? 'card--search' : ''}"
        @click=${(event: Event) => {
          this.handleCardClick(event);
        }}
      >
        <div class="marker" style="background: ${markerColor}"></div>
        <div class="body">
          ${isSearch
            ? html`
                <p class="source">
                  <span class="page-title">${this.highlight.page_title}</span>
                  <span class="domain">${this.highlight.domain}</span>
                </p>
              `
            : ''}
          <p class="text" title=${this.highlight.selected_text}>${this.highlight.selected_text}</p>
          <div class="meta">
            ${this.highlight.tag_ids.map((tagId) => {
              const tag = this.tagsById.get(tagId);
              return tag
                ? html`<span class="tag" style="border-color: ${tag.color}">${tag.name}</span>`
                : nothing;
            })}
            ${hasNote ? html`<span class="note-icon" title=${this.highlight.note}>📝</span>` : ''}
            <time class="time" datetime=${new Date(this.highlight.created_at).toISOString()}>
              ${formatRelativeTime(this.highlight.created_at)}
            </time>
          </div>
          <div class="actions">
            <button
              type="button"
              class="action-btn action-btn--icon"
              aria-label="コピー"
              title="コピー"
              @click=${(event: Event) => {
                event.stopPropagation();
                void this.handleCopy();
              }}
            >
              📋
            </button>
            <button
              type="button"
              class="action-btn action-btn--danger action-btn--icon"
              aria-label="削除"
              title="削除"
              @click=${(event: Event) => {
                event.stopPropagation();
                void this.handleDelete();
              }}
            >
              🗑
            </button>
            ${isSearch
              ? ''
              : html`
                  <button
                    type="button"
                    class="action-btn"
                    @click=${() => {
                      void this.handleJump();
                    }}
                  >
                    ジャンプ
                  </button>
                `}
          </div>
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-highlight-card': MarkwellHighlightCard;
  }
}
