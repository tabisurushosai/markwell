import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { Tag } from '../../shared/types/tag.js';

@customElement('markwell-tag-chips')
export class MarkwellTagChips extends LitElement {
  @property({ attribute: false }) tags: Tag[] = [];

  @property({ attribute: false }) selectedTagIds: string[] = [];

  static styles = css`
    :host {
      display: block;
      flex-shrink: 0;
    }

    .row {
      display: flex;
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

  render() {
    if (this.tags.length === 0) {
      return html`<div class="row"><span class="empty">タグがありません</span></div>`;
    }

    const selected = new Set(this.selectedTagIds);

    return html`
      <div class="row" role="list">
        ${this.tags.map(
          (tag) => html`
            <button
              type="button"
              class="chip ${selected.has(tag.id) ? 'chip--selected' : ''}"
              role="listitem"
              aria-pressed=${selected.has(tag.id)}
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
