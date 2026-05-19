import { LitElement, css, html, nothing } from 'lit';
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

import { canUsePageSummary } from '../../shared/ai/page-summary.js';
import { formatAiButtonLabel, formatAiButtonTitle } from '../../shared/license/ai-access.js';
import { listHighlights } from '../../shared/storage/highlights.js';
import { listTags } from '../../shared/storage/tags.js';
import type { Highlight } from '../../shared/types/highlight.js';
import type { Tag } from '../../shared/types/tag.js';
import '../components/highlight-card.js';
import { accessibilityStyles } from '../../shared/styles/accessibility.js';
import { dispatchToast, type ToastKind } from '../../shared/components/toast.js';
import { popupDesignTokens } from '../styles.js';
import {
  fetchPageTextFromActiveTab,
  requestPageSummaryViaBackground,
} from '../utils/page-summary-client.js';
import { t } from '../../shared/utils/i18n.js';
import { getCanonicalUrlForActiveTab } from '../utils/tab-url.js';

@customElement('markwell-current-page-view')
export class MarkwellCurrentPageView extends LitElement {
  @property({ attribute: false }) selectedTagIds: string[] = [];

  @property() selectedProjectFilter: ProjectFilterValue = 'all';

  @property({ attribute: false }) dateFilter: DateFilterValue = { ...DEFAULT_DATE_FILTER };

  @property({ type: Number }) focusedCardIndex = -1;

  @property() licenseTier: 'free' | 'trial' | 'premium' = 'free';

  @property() translateTargetLang = 'ja';

  @state() private highlights: Highlight[] = [];

  @state() private tagsById: ReadonlyMap<string, Tag> = new Map();

  @state() private loading = true;

  @state() private summarizing = false;

  @state() private summaryModalOpen = false;

  @state() private summaryText = '';


  static styles = [
    popupDesignTokens,
    accessibilityStyles,
    css`
    :host {
      display: block;
    }

    .panel-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .panel-title {
      margin: 0;
      font-size: var(--font-size-tab);
      font-weight: 600;
      color: var(--text-muted);
    }

    .summary-btn {
      flex-shrink: 0;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .summary-btn:hover:not(:disabled) {
      border-color: var(--accent);
    }

    .summary-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    .dialog-btn:hover {
      border-color: var(--accent);
    }

    .dialog-btn--primary {
      background: color-mix(in srgb, var(--accent) 18%, var(--surface));
      border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
      font-weight: 600;
    }
  `,
  ];

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

  private showToast(message: string, kind: ToastKind = 'info'): void {
    dispatchToast(this, message, kind);
  }

  private closeSummaryModal(): void {
    this.summaryModalOpen = false;
    this.summaryText = '';
  }

  private requestPremiumUnlock(): void {
    this.dispatchEvent(
      new CustomEvent('mw-premium-unlock', {
        bubbles: true,
        composed: true,
        detail: { feature: 'page_summary' },
      }),
    );
  }

  private async copySummary(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.summaryText);
      this.showToast(t('popup_summary_copied'), 'success');
    } catch {
      this.showToast(t('side_panel_copy_failed'), 'error');
    }
  }

  private pageTextErrorMessage(reason: string): string {
    switch (reason) {
      case 'empty':
        return t('popup_page_text_empty');
      case 'content_unavailable':
        return t('popup_page_text_unavailable');
      case 'no_tab':
        return t('popup_no_active_tab');
      default:
        return t('popup_page_text_fetch_failed');
    }
  }

  private async handlePageSummary(): Promise<void> {
    if (!canUsePageSummary(this.licenseTier)) {
      this.requestPremiumUnlock();
      return;
    }

    this.summarizing = true;
    this.summaryModalOpen = false;
    this.summaryText = '';

    try {
      const pageText = await fetchPageTextFromActiveTab();
      if (!pageText.ok) {
        this.showToast(this.pageTextErrorMessage(pageText.reason), 'warning');
        return;
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const pageTitle = tabs[0]?.title;

      const summary = await requestPageSummaryViaBackground(pageText.text, pageTitle);
      if (!summary.ok) {
        if (summary.code === 'PREMIUM_REQUIRED') {
          this.requestPremiumUnlock();
          return;
        }
        this.showToast(summary.error, 'error');
        return;
      }

      this.summaryText = summary.summary;
      this.summaryModalOpen = true;
      if (pageText.truncated) {
        this.showToast(t('popup_summary_truncated_toast'), 'info');
      }
    } finally {
      this.summarizing = false;
    }
  }

  private get filteredHighlights(): Highlight[] {
    const byDate = filterHighlightsByDate(this.highlights, this.dateFilter);
    const byProject = filterHighlightsByProject(byDate, this.selectedProjectFilter);
    return filterHighlightsByTagIds(byProject, this.selectedTagIds);
  }

  private renderSummaryModal() {
    if (!this.summaryModalOpen) {
      return nothing;
    }

    return html`
      <div
        class="dialog-backdrop"
        role="presentation"
        @click=${(event: Event) => {
          if (event.target === event.currentTarget) {
            this.closeSummaryModal();
          }
        }}
      >
        <div
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="page-summary-title"
          @click=${(event: Event) => { event.stopPropagation(); }}
        >
          <h3 id="page-summary-title" class="dialog-title">${t('popup_page_summary_title')}</h3>
          <div class="dialog-body">${this.summaryText}</div>
          <div class="dialog-actions">
            <button
              type="button"
              class="dialog-btn"
              aria-label=${t('mini_toolbar_close')}
              @click=${() => {
                this.closeSummaryModal();
              }}
            >
              ${t('mini_toolbar_close')}
            </button>
            <button
              type="button"
              class="dialog-btn dialog-btn--primary"
              aria-label=${t('card_action_copy')}
              @click=${() => {
                void this.copySummary();
              }}
            >
              ${t('card_action_copy')}
            </button>
          </div>
        </div>
      </div>
    `;
  }


  private renderHighlightsBody() {
    if (this.loading) {
      return html`<p class="empty">${t('side_panel_loading')}</p>`;
    }

    if (this.highlights.length === 0) {
      return html`<p class="empty">${t('popup_empty_current')}</p>`;
    }

    const visible = this.filteredHighlights;
    if (visible.length === 0) {
      return html`<p class="empty">${t('popup_filtered_empty')}</p>`;
    }

    return html`
      <p class="panel-title">${t('popup_highlights_count', [String(visible.length)])}</p>
      <div class="list">
        ${visible.map(
          (highlight, index) => html`
            <markwell-highlight-card
              .highlight=${highlight}
              .tagsById=${this.tagsById}
              .licenseTier=${this.licenseTier}
              .translateTargetLang=${this.translateTargetLang}
              ?keyboard-focused=${index === this.focusedCardIndex}
              @mw-refresh=${() => {
                this.handleRefresh();
              }}
            ></markwell-highlight-card>
          `,
        )}
      </div>
    `;
  }

  render() {
    return html`
      <div class="panel-header">
        <h2 class="panel-title">${t('popup_current_page_title')}</h2>
        <button
          type="button"
          class="summary-btn"
          aria-label=${this.summarizing
            ? t('popup_summarizing')
            : formatAiButtonTitle(t('popup_page_summary_button_title'), this.licenseTier, 'page_summary')}
          title=${formatAiButtonTitle(t('popup_page_summary_button_title'), this.licenseTier, 'page_summary')}
          ?disabled=${this.summarizing}
          @click=${() => {
            void this.handlePageSummary();
          }}
        >
          ${this.summarizing
            ? t('popup_summarizing')
            : formatAiButtonLabel(t('popup_page_summary_button_label'), this.licenseTier, 'page_summary')}
        </button>
      </div>
      ${this.renderHighlightsBody()}
      ${this.renderSummaryModal()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-current-page-view': MarkwellCurrentPageView;
  }
}
