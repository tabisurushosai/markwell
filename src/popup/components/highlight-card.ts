import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { deleteHighlight } from '../../shared/storage/highlights.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Tag } from '../../shared/types/tag.js';
import { formatHighlightAsMarkdown } from '../utils/format-highlight-markdown.js';
import { openDeleteConfirmDialog } from '../delete-confirm-dialog.js';
import { notifyHighlightRemovedOnOpenTabs } from '../utils/notify-highlight-removed.js';
import { formatRelativeTime } from '../utils/relative-time.js';
import { isJumpToHighlightResponse } from '../utils/jump.js';
import { popupDesignTokens } from '../styles.js';
import { getActiveTabId } from '../utils/tab-url.js';

const COPY_LONG_PRESS_MS = 300;

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

  @property() licenseTier: 'free' | 'trial' | 'premium' = 'free';

  @property({ type: Boolean, attribute: 'keyboard-focused' }) keyboardFocused = false;

  @property({ type: Boolean, attribute: 'show-related-action' }) showRelatedAction = true;

  @state() private copyMenuOpen = false;

  private copyLongPressTimer: ReturnType<typeof setTimeout> | null = null;

  private copyLongPressTriggered = false;

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

    .card--keyboard-focus {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
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

    .tag--ai {
      border-style: dashed;
      color: var(--text-muted);
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

    .copy-wrap {
      position: relative;
    }

    .copy-menu {
      position: absolute;
      right: 0;
      bottom: calc(100% + 4px);
      z-index: 10;
      min-width: 180px;
      padding: var(--space-1) 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .copy-menu-item {
      display: block;
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: none;
      background: transparent;
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
    }

    .copy-menu-item:hover {
      background: var(--surface);
    }
  `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('pointerdown', this.onDocumentPointerDown, true);
  }

  disconnectedCallback(): void {
    this.clearCopyLongPressTimer();
    this.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    super.disconnectedCallback();
  }

  private readonly onDocumentPointerDown = (event: Event): void => {
    if (!this.copyMenuOpen) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && this.renderRoot.contains(target)) {
      return;
    }
    this.copyMenuOpen = false;
  };

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

  private clearCopyLongPressTimer(): void {
    if (this.copyLongPressTimer !== null) {
      clearTimeout(this.copyLongPressTimer);
      this.copyLongPressTimer = null;
    }
  }

  private onCopyPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    this.copyLongPressTriggered = false;
    this.clearCopyLongPressTimer();
    this.copyLongPressTimer = setTimeout(() => {
      this.copyLongPressTriggered = true;
      this.copyLongPressTimer = null;
      void this.handleCopyMarkdown();
    }, COPY_LONG_PRESS_MS);
  }

  private onCopyPointerUp(): void {
    this.clearCopyLongPressTimer();
  }

  private onCopyClick(event: Event): void {
    event.stopPropagation();
    if (this.copyLongPressTriggered) {
      this.copyLongPressTriggered = false;
      return;
    }
    void this.handleCopyPlain();
  }

  private onCopyContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.copyMenuOpen = true;
  }

  /** キーボード / 外部からのプレーンテキストコピー */
  async copyPlain(): Promise<void> {
    await this.handleCopyPlain();
  }

  /** キーボード / 外部からのジャンプ（検索モードはページを開く） */
  async jump(): Promise<void> {
    if (this.mode === 'search') {
      this.dispatchEvent(
        new CustomEvent('mw-open-highlight', {
          bubbles: true,
          composed: true,
          detail: { highlight: this.highlight },
        }),
      );
      return;
    }
    await this.handleJump();
  }

  /** キーボード / 外部からの削除（confirm 付き） */
  deleteWithConfirm(): void {
    this.handleDelete();
  }

  private async handleCopyPlain(): Promise<void> {
    await navigator.clipboard.writeText(this.highlight.selected_text);
    this.showToast('コピーしました');
  }

  private async handleCopyMarkdown(): Promise<void> {
    this.copyMenuOpen = false;
    const markdown = formatHighlightAsMarkdown(this.highlight);
    await navigator.clipboard.writeText(markdown);
    this.showToast('Markdown をコピーしました');
  }

  private handleDelete(): void {
    const highlight = this.highlight;
    openDeleteConfirmDialog({
      onConfirm: async () => {
        await deleteHighlight(highlight.id);
        await notifyHighlightRemovedOnOpenTabs(highlight);
        this.dispatchRefresh();
      },
    });
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

  private canUseRelatedHighlights(): boolean {
    return (
      this.showRelatedAction &&
      (this.licenseTier === 'trial' || this.licenseTier === 'premium')
    );
  }

  private handleFindRelated(event: Event): void {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('mw-find-related', {
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
        class="card ${isSearch ? 'card--search' : ''} ${this.keyboardFocused
          ? 'card--keyboard-focus'
          : ''}"
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
            ${this.highlight.ai_tags.map(
              (aiTag) => html`<span class="tag tag--ai" title="AI タグ">${aiTag}</span>`,
            )}
            ${hasNote ? html`<span class="note-icon" title=${this.highlight.note}>📝</span>` : ''}
            <time class="time" datetime=${new Date(this.highlight.created_at).toISOString()}>
              ${formatRelativeTime(this.highlight.created_at)}
            </time>
          </div>
          <div class="actions">
            <div class="copy-wrap">
              <button
                type="button"
                class="action-btn"
                title="クリック: テキスト / 長押し・右クリック: Markdown"
                @pointerdown=${(event: PointerEvent) => {
                  this.onCopyPointerDown(event);
                }}
                @pointerup=${() => {
                  this.onCopyPointerUp();
                }}
                @pointerleave=${() => {
                  this.onCopyPointerUp();
                }}
                @pointercancel=${() => {
                  this.onCopyPointerUp();
                }}
                @click=${(event: Event) => {
                  this.onCopyClick(event);
                }}
                @contextmenu=${(event: MouseEvent) => {
                  this.onCopyContextMenu(event);
                }}
              >
                コピー
              </button>
              ${this.copyMenuOpen
                ? html`
                    <div
                      class="copy-menu"
                      role="menu"
                      @click=${(event: Event) => {
                        event.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        class="copy-menu-item"
                        role="menuitem"
                        @click=${() => {
                          void this.handleCopyMarkdown();
                        }}
                      >
                        Markdown 形式でコピー
                      </button>
                    </div>
                  `
                : nothing}
            </div>
            <button
              type="button"
              class="action-btn action-btn--danger"
              @click=${(event: Event) => {
                event.stopPropagation();
                void this.handleDelete();
              }}
            >
              削除
            </button>
            ${this.canUseRelatedHighlights()
              ? html`
                  <button
                    type="button"
                    class="action-btn"
                    title="意味的に近いハイライトを提案"
                    @click=${(event: Event) => {
                      this.handleFindRelated(event);
                    }}
                  >
                    🔗 関連
                  </button>
                `
              : nothing}
            ${isSearch
              ? ''
              : html`
                  <button
                    type="button"
                    class="action-btn"
                    @click=${(event: Event) => {
                      event.stopPropagation();
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
