import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { deleteHighlight } from '../../shared/storage/highlights.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Tag } from '../../shared/types/tag.js';
import { formatRelativeTime } from '../utils/relative-time.js';
import { getActiveTabId } from '../utils/tab-url.js';

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

  static styles = css`
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
  `;

  private dispatchRefresh(): void {
    this.dispatchEvent(
      new CustomEvent('mw-refresh', { bubbles: true, composed: true }),
    );
  }

  private async handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(this.highlight.selected_text);
  }

  private async handleDelete(): Promise<void> {
    await deleteHighlight(this.highlight.id);
    this.dispatchRefresh();
  }

  private async handleJump(): Promise<void> {
    const tabId = await getActiveTabId();
    if (tabId === null) {
      return;
    }
    await chrome.tabs.sendMessage(tabId, {
      type: 'JUMP_TO_HIGHLIGHT',
      highlightId: this.highlight.id,
    });
    window.close();
  }

  render() {
    const markerColor = COLOR_VAR[this.highlight.color];
    const hasNote = this.highlight.note.trim() !== '';

    return html`
      <article class="card">
        <div class="marker" style="background: ${markerColor}"></div>
        <div class="body">
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
              class="action-btn"
              @click=${() => {
                void this.handleCopy();
              }}
            >
              コピー
            </button>
            <button
              type="button"
              class="action-btn action-btn--danger"
              @click=${() => {
                void this.handleDelete();
              }}
            >
              削除
            </button>
            <button
              type="button"
              class="action-btn"
              @click=${() => {
                void this.handleJump();
              }}
            >
              ジャンプ
            </button>
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
