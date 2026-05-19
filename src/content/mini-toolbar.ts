import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { HighlightColor } from '../shared/types/highlight.js';
import { getSettings, setSettings } from '../shared/storage/settings.js';
import { TierLimitError } from '../shared/storage/highlights.js';
import { saveHighlightFromRange } from './highlight-save.js';
import { accessibilityStyles } from '../shared/styles/accessibility.js';
import { openUpgradeModal } from '../shared/components/upgrade-modal.js';
import { t } from '../shared/utils/i18n.js';
import { MARKWELL_SELECTION_EVENT, type MarkwellSelectionDetail } from './selection.js';

const TOOLBAR_OFFSET_PX = 8;

const COLOR_OPTIONS: ReadonlyArray<{ id: HighlightColor; hex: string }> = [
  { id: 'yellow', hex: '#ffd34e' },
  { id: 'green', hex: '#7dd87d' },
  { id: 'pink', hex: '#ff8ac2' },
  { id: 'blue', hex: '#7eb6ff' },
  { id: 'orange', hex: '#ffb347' },
];

@customElement('markwell-toolbar')
export class MarkwellToolbar extends LitElement {
  static override styles = [
    accessibilityStyles,
    css`
    :host {
      all: initial;
      --accent: #ffd34e;
      --text: #e0e0e0;
      --bg: #1a1a1a;
      position: fixed;
      z-index: 2147483647;
      font-family:
        system-ui,
        -apple-system,
        'Segoe UI',
        sans-serif;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 10px;
      background: #1a1a1a;
      color: #e0e0e0;
      border: 1px solid #333;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    .colors {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .color-dot {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      border: 2px solid #e0e0e0;
      cursor: pointer;
      padding: 0;
    }

    .color-dot:hover {
      transform: scale(1.08);
    }

    @media (prefers-reduced-motion: reduce) {
      .color-dot:hover {
        transform: none;
      }
    }

    .color-dot:focus-visible,
    .note-btn:focus-visible,
    .close-btn:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .note-btn,
    .close-btn {
      border: none;
      background: transparent;
      color: #e0e0e0;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      padding: 4px 6px;
      border-radius: 6px;
    }

    .note-btn:hover,
    .close-btn:hover {
      background: #2a2a2a;
    }

    .close-btn {
      font-size: 16px;
      font-weight: 700;
      padding: 2px 8px;
    }
  `,
  ];

  @property({ attribute: false })
  onColorSelect: ((color: HighlightColor) => void) | null = null;

  @property({ attribute: false })
  onNoteRequest: (() => void) | null = null;

  @property({ attribute: false })
  onCloseRequest: (() => void) | null = null;

  private handleColorClick(color: HighlightColor): void {
    this.onColorSelect?.(color);
  }

  private handleNoteClick(): void {
    this.onNoteRequest?.();
  }

  private handleCloseClick(): void {
    this.onCloseRequest?.();
  }

  override render() {
    return html`
      <div class="toolbar" role="toolbar" aria-label="Markwell highlight toolbar">
        <div class="colors">
          ${COLOR_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="color-dot"
                style="background-color: ${option.hex}"
                title=${option.id}
                aria-label=${t('content_highlight_color_aria', option.id)}
                @click=${() => {
                  this.handleColorClick(option.id);
                }}
              ></button>
            `,
          )}
        </div>
        <button
          type="button"
          class="note-btn"
          aria-label=${t('mini_toolbar_note')}
          @click=${() => {
            this.handleNoteClick();
          }}
        >
          ${t('mini_toolbar_note')}
        </button>
        <button
          type="button"
          class="close-btn"
          aria-label=${t('mini_toolbar_close')}
          @click=${() => {
            this.handleCloseClick();
          }}
        >
          ×
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markwell-toolbar': MarkwellToolbar;
  }
}

let activeToolbar: MarkwellToolbar | null = null;
let activeRange: Range | null = null;

const HIDE_TOOLBARS_EVENT = 'markwell:hide-toolbars';

function hideToolbar(): void {
  activeToolbar?.remove();
  activeToolbar = null;
  activeRange = null;
}

function dispatchHideAllToolbars(): void {
  document.dispatchEvent(new CustomEvent(HIDE_TOOLBARS_EVENT));
}

function isSelectionCollapsed(): boolean {
  const selection = document.getSelection();
  return selection === null || selection.rangeCount === 0 || selection.isCollapsed;
}

async function saveHighlightFromToolbar(
  range: Range,
  color: HighlightColor,
  note = '',
): Promise<void> {
  try {
    await saveHighlightFromRange(range, color, note);
  } catch (error) {
    if (error instanceof TierLimitError) {
      void openUpgradeModal({
        featureName: t('content_feature_highlight_save'),
        limit: error.limit,
      });
      return;
    }
    throw error;
  }
}

function positionToolbar(toolbar: MarkwellToolbar, range: Range): void {
  const selectionRect = range.getBoundingClientRect();
  const toolbarRect = toolbar.getBoundingClientRect();
  const top = selectionRect.top - TOOLBAR_OFFSET_PX - toolbarRect.height;
  const left = selectionRect.left + selectionRect.width / 2 - toolbarRect.width / 2;

  toolbar.style.top = `${String(Math.max(8, top))}px`;
  toolbar.style.left = `${String(Math.max(8, left))}px`;
}

function showToolbar(range: Range): void {
  dispatchHideAllToolbars();
  activeRange = range.cloneRange();

  const toolbar = document.createElement('markwell-toolbar');
  toolbar.onColorSelect = (color) => {
    void (async () => {
      if (activeRange === null) {
        return;
      }
      await setSettings({ default_color: color });
      await saveHighlightFromToolbar(activeRange, color);
      hideToolbar();
      document.getSelection()?.removeAllRanges();
    })();
  };

  toolbar.onNoteRequest = () => {
    void (async () => {
      if (activeRange === null) {
        return;
      }
      // Note dialog UI: follow-up prompt.
      console.log('[markwell] note dialog pending (next prompt)');
      const settings = await getSettings();
      await saveHighlightFromToolbar(activeRange, settings.default_color, '');
      hideToolbar();
      document.getSelection()?.removeAllRanges();
    })();
  };

  toolbar.onCloseRequest = () => {
    hideToolbar();
    document.getSelection()?.removeAllRanges();
  };

  document.body.appendChild(toolbar);
  activeToolbar = toolbar;

  requestAnimationFrame(() => {
    if (activeToolbar === toolbar && activeRange !== null) {
      positionToolbar(toolbar, activeRange);
    }
  });
}

function handleOutsidePointerDown(event: MouseEvent): void {
  if (activeToolbar === null) {
    return;
  }

  const path = event.composedPath();
  if (path.includes(activeToolbar)) {
    return;
  }

  hideToolbar();
}

export function initMiniToolbar(): void {
  document.addEventListener(HIDE_TOOLBARS_EVENT, () => {
    hideToolbar();
  });

  window.addEventListener(MARKWELL_SELECTION_EVENT, (event: Event) => {
    const detail = (event as CustomEvent<MarkwellSelectionDetail>).detail;
    showToolbar(detail.range);
  });

  document.addEventListener('selectionchange', () => {
    if (isSelectionCollapsed()) {
      hideToolbar();
    }
  });

  document.addEventListener('scroll', hideToolbar, true);
  document.addEventListener('mousedown', handleOutsidePointerDown, true);
}
