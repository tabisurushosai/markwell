import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
  canUseFactCheck,
  factCheckHighlightText,
  formatFactCheckForCopy,
  getFactCheckButtonLabel,
  type FactCheckResult,
} from '../../shared/ai/fact-check.js';
import {
  canUseRephrase,
  getRephraseStyleLabel,
  REPHRASE_STYLES,
  rephraseHighlightText,
  type RephraseStyle,
} from '../../shared/ai/rephrase.js';
import { AiAccessError, canUseAiFeature, formatAiButtonTitle } from '../../shared/license/ai-access.js';
import {
  getCachedTranslation,
  getTranslateLanguageLabel,
  mergeTranslationCache,
  translateHighlightText,
} from '../../shared/ai/translation.js';
import { deleteHighlight, updateHighlight } from '../../shared/storage/highlights.js';
import { createTag } from '../../shared/storage/tags.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Tag } from '../../shared/types/tag.js';
import { formatHighlightAsMarkdown } from '../utils/format-highlight-markdown.js';
import { openDeleteConfirmDialog } from '../delete-confirm-dialog.js';
import {
  buildTagAutocompleteOptions,
  formatTagAutocompleteLabel,
  type TagAutocompleteOption,
} from '../utils/tag-autocomplete.js';
import { notifyHighlightRemovedOnOpenTabs } from '../utils/notify-highlight-removed.js';
import { formatRelativeTime } from '../utils/relative-time.js';
import { isJumpToHighlightResponse } from '../utils/jump.js';
import { popupDesignTokens } from '../styles.js';
import { getActiveTabId } from '../utils/tab-url.js';

const COPY_LONG_PRESS_MS = 300;
const DEFAULT_NEW_TAG_COLOR = '#ffd34e';

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

  @property() translateTargetLang = 'ja';

  @state() private copyMenuOpen = false;

  @state() private translationExpanded = false;

  @state() private translationBody = '';

  @state() private translating = false;

  @state() private rephraseStyleModalOpen = false;

  @state() private rephraseResultModalOpen = false;

  @state() private rephrasePremiumModalOpen = false;

  @state() private relatedPremiumModalOpen = false;

  @state() private rephraseStyle: RephraseStyle = 'polite';

  @state() private rephrasing = false;

  @state() private rephraseResultText = '';

  @state() private factCheckModalOpen = false;

  @state() private factCheckPremiumModalOpen = false;

  @state() private factChecking = false;

  @state() private factCheckResult: FactCheckResult | null = null;

  @state() private tagMenuOpen = false;

  @state() private tagInput = '';

  @state() private tagSuggestionIndex = 0;

  @state() private tagAdding = false;

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

    .tag-wrap {
      position: relative;
    }

    .tag-menu {
      position: absolute;
      left: 0;
      bottom: calc(100% + 4px);
      z-index: 10;
      width: min(240px, 70vw);
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .tag-input {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: var(--space-1);
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
    }

    .tag-input:focus {
      outline: 2px solid var(--accent);
      outline-offset: 0;
      border-color: var(--accent);
    }

    .tag-suggestions {
      margin: 0;
      padding: 0;
      list-style: none;
      max-height: 180px;
      overflow-y: auto;
    }

    .tag-suggestion {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      width: 100%;
      padding: var(--space-1) var(--space-2);
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
    }

    .tag-suggestion:hover,
    .tag-suggestion--active {
      background: var(--surface);
    }

    .tag-suggestion--create {
      color: var(--accent);
    }

    .tag-suggestion-swatch {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 999px;
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

    .translation {
      margin-top: var(--space-2);
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
    }

    .translation-label {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-muted);
    }

    .translation-text {
      margin: 0;
      font-size: var(--font-size-sm);
      line-height: 1.5;
      color: var(--text);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .translation-status {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-3);
      background: rgba(0, 0, 0, 0.5);
    }

    .dialog {
      width: min(360px, 100%);
      max-height: min(80vh, 480px);
      display: flex;
      flex-direction: column;
      padding: var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface-raised);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .dialog-title {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-base);
      font-weight: 600;
    }

    .dialog-message {
      margin: 0 0 var(--space-3);
      font-size: var(--font-size-sm);
      line-height: 1.55;
      color: var(--text-muted);
    }

    .dialog-body {
      flex: 1;
      min-height: 0;
      margin: 0 0 var(--space-3);
      padding: var(--space-2);
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
      font-size: var(--font-size-base);
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .dialog-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      justify-content: flex-end;
    }

    .dialog-btn {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .dialog-btn:hover:not(:disabled) {
      border-color: var(--accent);
    }

    .dialog-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dialog-btn--primary {
      background: color-mix(in srgb, var(--accent) 18%, var(--surface));
      border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
      font-weight: 600;
    }

    .style-label {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-muted);
    }

    .style-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0 0 var(--space-3);
    }

    .style-options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }

    .style-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin-bottom: var(--space-3);
    }

    .style-list .style-btn {
      width: 100%;
      text-align: left;
    }

    .style-btn {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
    }

    .style-options .style-btn {
      width: auto;
      padding: var(--space-1) var(--space-2);
      color: var(--text-muted);
      text-align: center;
    }

    .style-btn:hover:not(:disabled) {
      border-color: var(--accent);
      color: var(--text);
    }

    .style-btn--selected {
      border-color: var(--accent);
      color: var(--text);
      background: color-mix(in srgb, var(--accent) 12%, var(--surface));
    }

    .rephrase-status {
      margin: 0 0 var(--space-3);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .fact-check-sources {
      margin: var(--space-3) 0 0;
      padding: 0;
      list-style: none;
    }

    .fact-check-sources-title {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-muted);
    }

    .fact-check-source {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-sm);
      line-height: 1.45;
    }

    .fact-check-source a {
      color: var(--accent);
      text-decoration: none;
      word-break: break-all;
    }

    .fact-check-source a:hover {
      text-decoration: underline;
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
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (this.renderRoot.contains(target)) {
      return;
    }
    this.copyMenuOpen = false;
    this.tagMenuOpen = false;
  };

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('tagMenuOpen') && this.tagMenuOpen) {
      const input = this.renderRoot.querySelector('.tag-input');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }
  }

  private getTagSuggestions(): TagAutocompleteOption[] {
    return buildTagAutocompleteOptions(
      [...this.tagsById.values()],
      this.tagInput,
      this.highlight.tag_ids,
    );
  }

  private clampTagSuggestionIndex(suggestions: TagAutocompleteOption[]): void {
    if (suggestions.length === 0) {
      this.tagSuggestionIndex = 0;
      return;
    }
    if (this.tagSuggestionIndex >= suggestions.length) {
      this.tagSuggestionIndex = suggestions.length - 1;
    }
    if (this.tagSuggestionIndex < 0) {
      this.tagSuggestionIndex = 0;
    }
  }

  private toggleTagMenu(event: Event): void {
    event.stopPropagation();
    this.copyMenuOpen = false;
    this.tagMenuOpen = !this.tagMenuOpen;
    if (!this.tagMenuOpen) {
      this.tagInput = '';
      this.tagSuggestionIndex = 0;
    }
  }

  private closeTagMenu(): void {
    this.tagMenuOpen = false;
    this.tagInput = '';
    this.tagSuggestionIndex = 0;
  }

  private onTagInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    this.tagInput = input.value;
    this.tagSuggestionIndex = 0;
    this.clampTagSuggestionIndex(this.getTagSuggestions());
  }

  private onTagInputKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    const suggestions = this.getTagSuggestions();

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeTagMenu();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      this.tagSuggestionIndex = (this.tagSuggestionIndex + 1) % suggestions.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (suggestions.length === 0) {
        return;
      }
      this.tagSuggestionIndex =
        (this.tagSuggestionIndex - 1 + suggestions.length) % suggestions.length;
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const activeIndex =
        suggestions.length === 0 ? 0 : Math.min(this.tagSuggestionIndex, suggestions.length - 1);
      void this.applyTagSuggestion(suggestions[activeIndex] ?? null);
    }
  }

  private async applyTagSuggestion(suggestion: TagAutocompleteOption | null): Promise<void> {
    if (suggestion === null) {
      const trimmed = this.tagInput.trim();
      if (trimmed === '') {
        return;
      }
      await this.applyTagName(trimmed);
      return;
    }

    if (suggestion.kind === 'existing') {
      await this.applyTagName(suggestion.tag.name);
      return;
    }

    await this.applyTagName(suggestion.name);
  }

  private async applyTagName(name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed === '' || this.tagAdding) {
      return;
    }

    this.tagAdding = true;
    try {
      const existingByName = [...this.tagsById.values()].find(
        (tag) => tag.name.toLowerCase() === trimmed.toLowerCase(),
      );
      const tag = existingByName ?? (await createTag(trimmed, DEFAULT_NEW_TAG_COLOR));

      if (this.highlight.tag_ids.includes(tag.id)) {
        this.showToast('このタグは既に付いています');
        return;
      }

      const updated = await updateHighlight(this.highlight.id, {
        tag_ids: [...this.highlight.tag_ids, tag.id],
      });
      this.highlight = updated;
      this.tagInput = '';
      this.tagSuggestionIndex = 0;
      this.dispatchRefresh();
      this.showToast(`タグ「${tag.name}」を追加しました`);
    } catch (error) {
      this.showToast(error instanceof Error ? error.message : 'タグの追加に失敗しました');
    } finally {
      this.tagAdding = false;
    }
  }

  private renderTagMenu() {
    if (!this.tagMenuOpen) {
      return nothing;
    }

    const suggestions = this.getTagSuggestions();
    const activeIndex =
      suggestions.length === 0 ? 0 : Math.min(this.tagSuggestionIndex, suggestions.length - 1);

    return html`
      <div
        class="tag-menu"
        role="listbox"
        aria-label="タグ候補"
        @click=${(event: Event) => {
          event.stopPropagation();
        }}
      >
        <input
          class="tag-input"
          type="text"
          placeholder="タグを追加…"
          .value=${this.tagInput}
          ?disabled=${this.tagAdding}
          @input=${(event: Event) => {
            this.onTagInput(event);
          }}
          @keydown=${(event: KeyboardEvent) => {
            this.onTagInputKeydown(event);
          }}
        />
        <ul class="tag-suggestions">
          ${suggestions.length === 0
            ? html`<li><span class="tag-suggestion">候補がありません</span></li>`
            : suggestions.map((suggestion, index) => {
                const isActive = index === activeIndex;
                if (suggestion.kind === 'create') {
                  return html`
                    <li>
                      <button
                        type="button"
                        class="tag-suggestion tag-suggestion--create ${isActive
                          ? 'tag-suggestion--active'
                          : ''}"
                        role="option"
                        aria-selected=${isActive}
                        @click=${() => {
                          void this.applyTagSuggestion(suggestion);
                        }}
                      >
                        ${formatTagAutocompleteLabel(suggestion)}
                      </button>
                    </li>
                  `;
                }

                return html`
                  <li>
                    <button
                      type="button"
                      class="tag-suggestion ${isActive ? 'tag-suggestion--active' : ''}"
                      role="option"
                      aria-selected=${isActive}
                      @click=${() => {
                        void this.applyTagSuggestion(suggestion);
                      }}
                    >
                      <span
                        class="tag-suggestion-swatch"
                        style="background: ${suggestion.tag.color}"
                        aria-hidden="true"
                      ></span>
                      ${suggestion.tag.name}
                    </button>
                  </li>
                `;
              })}
        </ul>
      </div>
    `;
  }

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
    if ((event.target as HTMLElement).closest('button, input, .tag-menu')) {
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

  private showRelatedHighlightsButton(): boolean {
    return this.showRelatedAction;
  }

  private canUseRelatedHighlights(): boolean {
    return canUseAiFeature(this.licenseTier, 'related');
  }

  private handleRephraseClick(event: Event): void {
    event.stopPropagation();
    if (!canUseRephrase(this.licenseTier)) {
      this.rephrasePremiumModalOpen = true;
      return;
    }
    this.rephraseStyleModalOpen = true;
  }

  private closeRephraseStyleModal(): void {
    this.rephraseStyleModalOpen = false;
  }

  private closeRephraseResultModal(): void {
    this.rephraseResultModalOpen = false;
    this.rephraseResultText = '';
    this.rephrasing = false;
  }

  private closeRephrasePremiumModal(): void {
    this.rephrasePremiumModalOpen = false;
  }

  private handleFactCheckClick(event: Event): void {
    event.stopPropagation();
    if (!canUseFactCheck(this.licenseTier)) {
      this.factCheckPremiumModalOpen = true;
      return;
    }
    void this.runFactCheck();
  }

  private closeFactCheckModal(): void {
    this.factCheckModalOpen = false;
    this.factCheckResult = null;
    this.factChecking = false;
  }

  private closeFactCheckPremiumModal(): void {
    this.factCheckPremiumModalOpen = false;
  }

  private formatFactCheckError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message === 'API key not set') {
        return 'API キーが未設定です。設定画面で Gemini API キーを登録してください。';
      }
      if (error instanceof AiAccessError) {
        return 'ファクトチェックは Premium で利用できます。';
      }
      return error.message;
    }
    return 'ファクトチェックに失敗しました';
  }

  private async runFactCheck(): Promise<void> {
    this.factCheckModalOpen = true;
    this.factChecking = true;
    this.factCheckResult = null;

    try {
      this.factCheckResult = await factCheckHighlightText(this.highlight.selected_text);
    } catch (error) {
      this.closeFactCheckModal();
      if (error instanceof AiAccessError) {
        this.factCheckPremiumModalOpen = true;
        return;
      }
      this.showToast(this.formatFactCheckError(error));
    } finally {
      this.factChecking = false;
    }
  }

  private async copyFactCheckResult(): Promise<void> {
    if (this.factCheckResult === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(formatFactCheckForCopy(this.factCheckResult));
      this.showToast('ファクトチェック結果をコピーしました');
    } catch {
      this.showToast('コピーに失敗しました');
    }
  }

  private formatRephraseError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message === 'API key not set') {
        return 'API キーが未設定です。設定画面で Gemini API キーを登録してください。';
      }
      if (error instanceof AiAccessError) {
        return 'トライアルまたは Premium で利用できます。';
      }
      return error.message;
    }
    return '言い換えに失敗しました';
  }

  private async handleRephraseStyleSelect(style: RephraseStyle): Promise<void> {
    this.rephraseStyleModalOpen = false;
    this.rephraseStyle = style;
    this.rephraseResultModalOpen = true;
    this.rephrasing = true;
    this.rephraseResultText = '';

    try {
      this.rephraseResultText = await rephraseHighlightText(
        this.highlight.selected_text,
        style,
      );
    } catch (error) {
      this.closeRephraseResultModal();
      if (error instanceof AiAccessError) {
        this.rephrasePremiumModalOpen = true;
        return;
      }
      this.showToast(this.formatRephraseError(error));
    } finally {
      this.rephrasing = false;
    }
  }

  private async copyRephraseResult(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.rephraseResultText);
      this.showToast('言い換えをコピーしました');
    } catch {
      this.showToast('コピーに失敗しました');
    }
  }

  private closeRelatedPremiumModal(): void {
    this.relatedPremiumModalOpen = false;
  }

  private handleFindRelated(event: Event): void {
    event.stopPropagation();
    if (!this.canUseRelatedHighlights()) {
      this.relatedPremiumModalOpen = true;
      return;
    }
    this.dispatchEvent(
      new CustomEvent('mw-find-related', {
        bubbles: true,
        composed: true,
        detail: { highlight: this.highlight },
      }),
    );
  }

  private formatTranslationError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message === 'API key not set') {
        return 'API キーが未設定です。設定画面で Gemini API キーを登録してください。';
      }
      return error.message;
    }
    return '翻訳に失敗しました';
  }

  private async handleTranslate(event: Event): Promise<void> {
    event.stopPropagation();

    const targetLang = this.translateTargetLang;
    const cached = getCachedTranslation(this.highlight, targetLang);
    if (cached !== undefined) {
      this.translationBody = cached;
      this.translationExpanded = !this.translationExpanded;
      return;
    }

    if (this.translationExpanded) {
      this.translationExpanded = false;
      return;
    }

    this.translating = true;
    this.translationExpanded = true;
    this.translationBody = '';

    try {
      const translated = await translateHighlightText(this.highlight.selected_text, targetLang);
      const updated = await updateHighlight(this.highlight.id, {
        translation_cache: mergeTranslationCache(this.highlight, targetLang, translated),
      });
      this.highlight = updated;
      this.translationBody = translated;
    } catch (error) {
      this.translationExpanded = false;
      this.showToast(this.formatTranslationError(error));
    } finally {
      this.translating = false;
    }
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

    const translationLabel = getTranslateLanguageLabel(this.translateTargetLang);

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
            <div class="tag-wrap">
              <button
                type="button"
                class="action-btn action-btn--icon"
                title="タグを追加"
                aria-expanded=${this.tagMenuOpen}
                aria-haspopup="listbox"
                @click=${(event: Event) => {
                  this.toggleTagMenu(event);
                }}
              >
                ▾
              </button>
              ${this.renderTagMenu()}
            </div>
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
            <button
              type="button"
              class="action-btn"
              title=${`翻訳先: ${getTranslateLanguageLabel(this.translateTargetLang)}`}
              ?disabled=${this.translating}
              @click=${(event: Event) => {
                void this.handleTranslate(event);
              }}
            >
              ${this.translating ? '翻訳中…' : '🌐 翻訳'}
            </button>
            <button
              type="button"
              class="action-btn"
              title=${formatAiButtonTitle('選択テキストを言い換え', this.licenseTier, 'rephrase')}
              ?disabled=${this.rephrasing}
              @click=${(event: Event) => {
                this.handleRephraseClick(event);
              }}
            >
              ${this.rephrasing
                ? '言い換え中…'
                : canUseRephrase(this.licenseTier)
                  ? '✍️ 言い換え'
                  : '🔒 ✍️ 言い換え'}
            </button>
            <button
              type="button"
              class="action-btn"
              title=${formatAiButtonTitle(
                'web 検索で事実関係を確認',
                this.licenseTier,
                'fact_check',
              )}
              ?disabled=${this.factChecking}
              @click=${(event: Event) => {
                this.handleFactCheckClick(event);
              }}
            >
              ${this.factChecking ? '確認中…' : getFactCheckButtonLabel(this.licenseTier)}
            </button>
            ${this.showRelatedHighlightsButton()
              ? html`
                  <button
                    type="button"
                    class="action-btn"
                    title=${formatAiButtonTitle(
                      '意味的に近いハイライトを提案',
                      this.licenseTier,
                      'related',
                    )}
                    @click=${(event: Event) => {
                      this.handleFindRelated(event);
                    }}
                  >
                    ${this.canUseRelatedHighlights() ? '🔗 関連' : '🔒 🔗 関連'}
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
          ${this.translationExpanded
            ? html`
                <div class="translation" aria-live="polite">
                  <p class="translation-label">翻訳（${translationLabel}）</p>
                  ${this.translating
                    ? html`<p class="translation-status">翻訳中…</p>`
                    : html`<p class="translation-text">${this.translationBody}</p>`}
                </div>
              `
            : nothing}
        </div>
      </article>
      ${this.renderRephraseStyleModal()}
      ${this.renderRephraseResultModal()}
      ${this.renderRephrasePremiumModal()}
      ${this.renderFactCheckModal()}
      ${this.renderFactCheckPremiumModal()}
      ${this.renderRelatedPremiumModal()}
    `;
  }

  private renderRelatedPremiumModal() {
    if (!this.relatedPremiumModalOpen) {
      return nothing;
    }

    return html`
      <div
        class="dialog-backdrop"
        role="presentation"
        @click=${(event: Event) => {
          if (event.target === event.currentTarget) {
            this.closeRelatedPremiumModal();
          }
        }}
      >
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="related-premium-title"
          @click=${(event: Event) => event.stopPropagation()}
        >
          <h3 id="related-premium-title" class="dialog-title">トライアルで解放</h3>
          <p class="dialog-message">
            関連ハイライトはトライアルまたは Premium で利用できます。
          </p>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn dialog-btn--primary"
              @click=${() => {
                this.closeRelatedPremiumModal();
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderRephraseStyleModal() {
    if (!this.rephraseStyleModalOpen) {
      return nothing;
    }

    return html`
      <div class="dialog-backdrop"
        role="presentation"
        @click=${(event: Event) => {
          if (event.target === event.currentTarget) {
            this.closeRephraseStyleModal();
          }
        }}
      >
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rephrase-style-title"
          @click=${(event: Event) => event.stopPropagation()}
        >
          <h3 id="rephrase-style-title" class="dialog-title">言い換えスタイル</h3>
          <div class="style-list" role="listbox">
            ${REPHRASE_STYLES.map(
              (style) => html`
                <button
                  type="button"
                  class="style-btn"
                  role="option"
                  @click=${() => {
                    void this.handleRephraseStyleSelect(style);
                  }}
                >
                  ${getRephraseStyleLabel(style)}
                </button>
              `,
            )}
          </div>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn"
              @click=${() => {
                this.closeRephraseStyleModal();
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderRephraseResultModal() {
    if (!this.rephraseResultModalOpen) {
      return nothing;
    }

    const styleLabel = getRephraseStyleLabel(this.rephraseStyle);

    return html`
      <div
        class="dialog-backdrop"
        role="presentation"
        @click=${(event: Event) => {
          if (event.target === event.currentTarget) {
            this.closeRephraseResultModal();
          }
        }}
      >
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rephrase-result-title"
          @click=${(event: Event) => event.stopPropagation()}
        >
          <h3 id="rephrase-result-title" class="dialog-title">
            言い換え（${styleLabel}）
          </h3>
          <div class="dialog-body" aria-live="polite">
            ${this.rephrasing ? '言い換え中…' : this.rephraseResultText}
          </div>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn"
              @click=${() => {
                this.closeRephraseResultModal();
              }}
            >
              閉じる
            </button>
            <button
              type="button"
              class="dialog-btn dialog-btn--primary"
              ?disabled=${this.rephrasing || this.rephraseResultText === ''}
              @click=${() => {
                void this.copyRephraseResult();
              }}
            >
              コピー
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderFactCheckModal() {
    if (!this.factCheckModalOpen) {
      return nothing;
    }

    const result = this.factCheckResult;

    return html`
      <div
        class="dialog-backdrop"
        role="presentation"
        @click=${(event: Event) => {
          if (event.target === event.currentTarget) {
            this.closeFactCheckModal();
          }
        }}
      >
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fact-check-title"
          @click=${(event: Event) => event.stopPropagation()}
        >
          <h3 id="fact-check-title" class="dialog-title">🔎 ファクトチェック</h3>
          <div class="dialog-body" aria-live="polite">
            ${this.factChecking
              ? 'web 検索で確認中…'
              : result !== null
                ? result.answer
                : ''}
          </div>
          ${result !== null && result.sources.length > 0
            ? html`
                <div class="fact-check-sources">
                  <p class="fact-check-sources-title">出典</p>
                  <ul>
                    ${result.sources.map(
                      (source) => html`
                        <li class="fact-check-source">
                          <a
                            href=${source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            @click=${(event: Event) => event.stopPropagation()}
                          >
                            ${source.title}
                          </a>
                        </li>
                      `,
                    )}
                  </ul>
                </div>
              `
            : nothing}
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn"
              @click=${() => {
                this.closeFactCheckModal();
              }}
            >
              閉じる
            </button>
            <button
              type="button"
              class="dialog-btn dialog-btn--primary"
              ?disabled=${this.factChecking || result === null}
              @click=${() => {
                void this.copyFactCheckResult();
              }}
            >
              コピー
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderFactCheckPremiumModal() {
    if (!this.factCheckPremiumModalOpen) {
      return nothing;
    }

    return html`
      <div
        class="dialog-backdrop"
        role="presentation"
        @click=${(event: Event) => {
          if (event.target === event.currentTarget) {
            this.closeFactCheckPremiumModal();
          }
        }}
      >
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fact-check-premium-title"
          @click=${(event: Event) => event.stopPropagation()}
        >
          <h3 id="fact-check-premium-title" class="dialog-title">Premium で解放</h3>
          <p class="dialog-message">
            ファクトチェックは Premium で利用できます。
          </p>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn dialog-btn--primary"
              @click=${() => {
                this.closeFactCheckPremiumModal();
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderRephrasePremiumModal() {
    if (!this.rephrasePremiumModalOpen) {
      return nothing;
    }

    return html`
      <div
        class="dialog-backdrop"
        role="presentation"
        @click=${(event: Event) => {
          if (event.target === event.currentTarget) {
            this.closeRephrasePremiumModal();
          }
        }}
      >
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rephrase-premium-title"
          @click=${(event: Event) => event.stopPropagation()}
        >
          <h3 id="rephrase-premium-title" class="dialog-title">Premium で解放</h3>
          <p class="dialog-message">
            言い換えは Premium（またはトライアル）で利用できます。
          </p>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn dialog-btn--primary"
              @click=${() => {
                this.closeRephrasePremiumModal();
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-highlight-card': MarkwellHighlightCard;
  }
}
