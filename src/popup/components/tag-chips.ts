import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { Project } from '../../shared/types/project.js';
import type { Tag } from '../../shared/types/tag.js';
import {
  DEFAULT_DATE_FILTER,
  type DateFilterPreset,
  type DateFilterValue,
  isDateFilterActive,
} from '../utils/date-filter.js';
import { PROJECT_FILTER_ALL, type ProjectFilterValue } from '../utils/tag-filter.js';
import { t } from '../../shared/utils/i18n.js';

type LicenseTier = 'free' | 'trial' | 'premium';

const DATE_PRESETS: ReadonlyArray<{ id: DateFilterPreset; labelKey: string }> = [
  { id: 'today', labelKey: 'popup_date_today' },
  { id: '7d', labelKey: 'popup_date_7d' },
  { id: '30d', labelKey: 'popup_date_30d' },
  { id: 'all', labelKey: 'popup_tab_all' },
];

@customElement('markwell-tag-chips')
export class MarkwellTagChips extends LitElement {
  @property({ attribute: false }) tags: Tag[] = [];

  @property({ attribute: false }) projects: Project[] = [];

  @property({ attribute: false }) selectedTagIds: string[] = [];

  @property() selectedProjectFilter: ProjectFilterValue = 'all';

  @property({ attribute: false }) dateFilter: DateFilterValue = { ...DEFAULT_DATE_FILTER };

  @property() licenseTier: LicenseTier = 'free';

  @state() private datePanelOpen = false;

  @state() private customStartDraft = '';

  @state() private customEndDraft = '';

  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }

    .row {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      overflow-x: auto;
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--surface-raised);
      scrollbar-width: thin;
      scrollbar-color: var(--text-muted) var(--surface);
    }

    .row::-webkit-scrollbar {
      height: 4px;
    }

    .row::-webkit-scrollbar-thumb {
      background: var(--text-muted);
      border-radius: var(--radius-sm);
    }

    .date-toggle {
      flex-shrink: 0;
      width: 32px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
    }

    .date-toggle:hover {
      border-color: var(--text-muted);
    }

    .date-toggle--active,
    .date-toggle--open {
      border-color: var(--accent);
      background: var(--surface-raised);
    }

    .date-panel {
      padding: var(--space-2) var(--space-3) var(--space-3);
      border-bottom: 1px solid var(--surface-raised);
      background: var(--surface);
    }

    .preset-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      margin-bottom: var(--space-2);
    }

    .preset-btn {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--text-muted);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .preset-btn:hover {
      color: var(--text);
    }

    .preset-btn--selected {
      border-color: var(--accent);
      background: var(--surface-raised);
      color: var(--text);
      font-weight: 600;
    }

    .custom {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .custom-label {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .custom-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .custom-input {
      flex: 1;
      min-width: 0;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
    }

    .custom-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .premium-hint {
      margin: 0;
      font-size: var(--font-size-sm);
      color: var(--accent);
    }

    .apply-btn {
      align-self: flex-start;
      padding: var(--space-1) var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .apply-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .project-filter {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: var(--space-1);
    }

    .project-filter__label {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      white-space: nowrap;
    }

    .project-filter__select {
      max-width: 140px;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .project-filter__select:focus {
      outline: 2px solid var(--accent);
      outline-offset: 0;
      border-color: var(--accent);
    }

    .project-filter__select--active {
      border-color: var(--accent);
      background: var(--surface-raised);
    }

    .chip {
      flex-shrink: 0;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--text-muted);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
      white-space: nowrap;
    }

    .chip:hover {
      color: var(--text);
      border-color: var(--text-muted);
    }

    .chip--selected {
      background: var(--surface-raised);
      border-color: var(--accent);
      color: var(--text);
      font-weight: 600;
    }

    .empty {
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-size-sm);
      color: var(--text-muted);
      white-space: nowrap;
    }
  `;

  private get isPremium(): boolean {
    return this.licenseTier === 'premium';
  }

  private emitDateFilter(filter: DateFilterValue): void {
    this.dispatchEvent(
      new CustomEvent('mw-date-filter', {
        bubbles: true,
        composed: true,
        detail: { dateFilter: filter },
      }),
    );
  }

  private toggleTag(tagId: string): void {
    this.dispatchEvent(
      new CustomEvent('mw-tag-toggle', {
        bubbles: true,
        composed: true,
        detail: { tagId },
      }),
    );
  }

  private onProjectChange(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent('mw-project-filter', {
        bubbles: true,
        composed: true,
        detail: { projectFilter: select.value },
      }),
    );
  }

  private toggleDatePanel(): void {
    this.datePanelOpen = !this.datePanelOpen;
    if (this.datePanelOpen) {
      this.customStartDraft = this.dateFilter.customStart;
      this.customEndDraft = this.dateFilter.customEnd;
    }
  }

  private selectPreset(preset: DateFilterPreset): void {
    this.emitDateFilter({
      preset,
      customStart: '',
      customEnd: '',
    });
  }

  private applyCustomRange(): void {
    if (!this.isPremium) {
      return;
    }
    this.emitDateFilter({
      preset: 'custom',
      customStart: this.customStartDraft,
      customEnd: this.customEndDraft,
    });
  }

  render() {
    const selected = new Set(this.selectedTagIds);
    const projectActive = this.selectedProjectFilter !== PROJECT_FILTER_ALL;
    const dateActive = isDateFilterActive(this.dateFilter);

    return html`
      <div class="row">
        <button
          type="button"
          class="date-toggle ${dateActive ? 'date-toggle--active' : ''} ${this.datePanelOpen
            ? 'date-toggle--open'
            : ''}"
          aria-expanded=${this.datePanelOpen}
          aria-label=${t('popup_date_filter_label')}
          title=${t('popup_date_filter_label')}
          @click=${() => {
            this.toggleDatePanel();
          }}
        >
          📅
        </button>
        <label class="project-filter">
          <span class="project-filter__label">${t('popup_project_filter_label')}</span>
          <select
            class="project-filter__select ${projectActive ? 'project-filter__select--active' : ''}"
            .value=${this.selectedProjectFilter}
            @change=${(event: Event) => {
              this.onProjectChange(event);
            }}
          >
            <option value="all">${t('popup_tab_all')}</option>
            <option value="unassigned">${t('popup_project_unassigned')}</option>
            ${this.projects.map(
              (project) => html`
                <option value=${project.id}>${project.cover_emoji} ${project.name}</option>
              `,
            )}
          </select>
        </label>
        ${this.tags.length === 0
          ? html`<span class="empty">${t('popup_tags_empty')}</span>`
          : this.tags.map(
              (tag) => html`
                <button
                  type="button"
                  class="chip ${selected.has(tag.id) ? 'chip--selected' : ''}"
                  aria-label=${tag.name}
                  @click=${() => {
                    this.toggleTag(tag.id);
                  }}
                >
                  ${tag.name}
                </button>
              `,
            )}
      </div>
      ${this.datePanelOpen
        ? html`
            <div class="date-panel">
              <div class="preset-row">
                ${DATE_PRESETS.map(
                  (preset) => html`
                    <button
                      type="button"
                      class="preset-btn ${this.dateFilter.preset === preset.id
                        ? 'preset-btn--selected'
                        : ''}"
                      aria-label=${t(preset.labelKey)}
                      @click=${() => {
                        this.selectPreset(preset.id);
                      }}
                    >
                      ${t(preset.labelKey)}
                    </button>
                  `,
                )}
              </div>
              <div class="custom">
                <p class="custom-label">${t('popup_custom_date_range')}</p>
                ${this.isPremium
                  ? html`
                      <div class="custom-row">
                        <input
                          class="custom-input"
                          type="date"
                          .value=${this.customStartDraft}
                          @input=${(event: Event) => {
                            const input = event.target;
                            if (input instanceof HTMLInputElement) {
                              this.customStartDraft = input.value;
                            }
                          }}
                        />
                        <span>〜</span>
                        <input
                          class="custom-input"
                          type="date"
                          .value=${this.customEndDraft}
                          @input=${(event: Event) => {
                            const input = event.target;
                            if (input instanceof HTMLInputElement) {
                              this.customEndDraft = input.value;
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        class="apply-btn"
                        aria-label=${t('popup_apply')}
                        ?disabled=${this.customStartDraft === '' || this.customEndDraft === ''}
                        @click=${() => {
                          this.applyCustomRange();
                        }}
                      >
                        ${t('popup_apply')}
                      </button>
                    `
                  : html`
                      <div class="custom-row">
                        <input class="custom-input" type="date" disabled />
                        <span>〜</span>
                        <input class="custom-input" type="date" disabled />
                      </div>
                      <p class="premium-hint">${t('popup_premium_unlock_hint')}</p>
                    `}
              </div>
            </div>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-tag-chips': MarkwellTagChips;
  }
}
