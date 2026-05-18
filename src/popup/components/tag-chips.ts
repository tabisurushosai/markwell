import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { Project } from '../../shared/types/project.js';
import type { Tag } from '../../shared/types/tag.js';
import { PROJECT_FILTER_ALL, type ProjectFilterValue } from '../utils/tag-filter.js';

@customElement('markwell-tag-chips')
export class MarkwellTagChips extends LitElement {
  @property({ attribute: false }) tags: Tag[] = [];

  @property({ attribute: false }) projects: Project[] = [];

  @property({ attribute: false }) selectedTagIds: string[] = [];

  @property() selectedProjectFilter: ProjectFilterValue = 'all';

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
    const value = select.value;
    this.dispatchEvent(
      new CustomEvent('mw-project-filter', {
        bubbles: true,
        composed: true,
        detail: { projectFilter: value },
      }),
    );
  }

  render() {
    const selected = new Set(this.selectedTagIds);
    const projectActive = this.selectedProjectFilter !== PROJECT_FILTER_ALL;

    return html`
      <div class="row">
        <label class="project-filter">
          <span class="project-filter__label">📁 プロジェクト</span>
          <select
            class="project-filter__select ${projectActive ? 'project-filter__select--active' : ''}"
            .value=${this.selectedProjectFilter}
            @change=${(event: Event) => {
              this.onProjectChange(event);
            }}
          >
            <option value="all">すべて</option>
            <option value="unassigned">未所属</option>
            ${this.projects.map(
              (project) => html`
                <option value=${project.id}>${project.cover_emoji} ${project.name}</option>
              `,
            )}
          </select>
        </label>
        ${this.tags.length === 0
          ? html`<span class="empty">タグがありません</span>`
          : this.tags.map(
              (tag) => html`
                <button
                  type="button"
                  class="chip ${selected.has(tag.id) ? 'chip--selected' : ''}"
                  @click=${() => {
                    this.toggleTag(tag.id);
                  }}
                >
                  ${tag.name}
                </button>
              `,
            )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-tag-chips': MarkwellTagChips;
  }
}
