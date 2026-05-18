import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { deleteHighlight, getHighlight, updateHighlight } from '../shared/storage/highlights.js';
import { setSettings } from '../shared/storage/settings.js';
import type { HighlightColor } from '../shared/types/highlight.js';
import {
  findHighlightMarks,
  getHighlightMarksRect,
  removeHighlightFromDom,
  syncHighlightNoteInDom,
  updateHighlightColorInDom,
} from './highlighter.js';
import { closeDeleteConfirmDialog, openDeleteConfirmDialog } from './delete-confirm-dialog.js';
import { closeNoteDialog, openNoteDialog } from './note-dialog.js';

const TOOLBAR_OFFSET_PX = 8;
const HIDE_TOOLBARS_EVENT = 'markwell:hide-toolbars';

const COLOR_OPTIONS: ReadonlyArray<{ id: HighlightColor; hex: string }> = [
  { id: 'yellow', hex: '#ffd34e' },
  { id: 'green', hex: '#7dd87d' },
  { id: 'pink', hex: '#ff8ac2' },
  { id: 'blue', hex: '#7eb6ff' },
  { id: 'orange', hex: '#ffb347' },
];

@customElement('markwell-edit-toolbar')
export class MarkwellEditToolbar extends LitElement {
  static override styles = css`
    :host {
      all: initial;
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

    .color-dot.selected {
      border-color: #fff;
      box-shadow: 0 0 0 2px #7eb6ff;
    }

    .note-btn,
    .delete-btn,
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
    .delete-btn:hover,
    .close-btn:hover {
      background: #2a2a2a;
    }

    .delete-btn {
      color: #ff8a8a;
    }

    .close-btn {
      font-size: 16px;
      font-weight: 700;
      padding: 2px 8px;
    }
  `;

  @property({ type: String })
  currentColor: HighlightColor = 'yellow';

  @property({ attribute: false })
  onColorSelect: ((color: HighlightColor) => void) | null = null;

  @property({ attribute: false })
  onNoteRequest: (() => void) | null = null;

  @property({ attribute: false })
  onDeleteRequest: (() => void) | null = null;

  @property({ attribute: false })
  onCloseRequest: (() => void) | null = null;

  override render() {
    return html`
      <div class="toolbar" role="toolbar" aria-label="Markwell edit highlight toolbar">
        <div class="colors">
          ${COLOR_OPTIONS.map(
            (option) => html`
              <button
                type="button"
                class="color-dot ${option.id === this.currentColor ? 'selected' : ''}"
                style="background-color: ${option.hex}"
                title=${option.id}
                aria-label=${`Change color to ${option.id}`}
                aria-pressed=${option.id === this.currentColor ? 'true' : 'false'}
                @click=${() => {
                  this.onColorSelect?.(option.id);
                }}
              ></button>
            `,
          )}
        </div>
        <button
          type="button"
          class="note-btn"
          @click=${() => {
            this.onNoteRequest?.();
          }}
        >
          メモ
        </button>
        <button
          type="button"
          class="delete-btn"
          @click=${() => {
            this.onDeleteRequest?.();
          }}
        >
          削除
        </button>
        <button
          type="button"
          class="close-btn"
          aria-label="Close"
          @click=${() => {
            this.onCloseRequest?.();
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
    'markwell-edit-toolbar': MarkwellEditToolbar;
  }
}

let activeToolbar: MarkwellEditToolbar | null = null;
let activeHighlightId: string | null = null;

function hideEditToolbar(): void {
  closeNoteDialog();
  closeDeleteConfirmDialog();
  activeToolbar?.remove();
  activeToolbar = null;
  activeHighlightId = null;
}

function dispatchHideAllToolbars(): void {
  document.dispatchEvent(new CustomEvent(HIDE_TOOLBARS_EVENT));
}

function positionToolbar(toolbar: MarkwellEditToolbar, rect: DOMRect): void {
  const toolbarRect = toolbar.getBoundingClientRect();
  const top = rect.top - TOOLBAR_OFFSET_PX - toolbarRect.height;
  const left = rect.left + rect.width / 2 - toolbarRect.width / 2;

  toolbar.style.top = `${String(Math.max(8, top))}px`;
  toolbar.style.left = `${String(Math.max(8, left))}px`;
}

async function showEditToolbar(highlightId: string): Promise<void> {
  const highlight = await getHighlight(highlightId);
  if (highlight === null) {
    return;
  }

  const marks = findHighlightMarks(highlightId);
  if (marks.length === 0) {
    return;
  }

  dispatchHideAllToolbars();

  const toolbar = document.createElement('markwell-edit-toolbar');
  toolbar.currentColor = highlight.color;

  toolbar.onColorSelect = (color) => {
    void (async () => {
      if (activeHighlightId === null) {
        return;
      }
      await setSettings({ default_color: color });
      await updateHighlight(activeHighlightId, { color });
      updateHighlightColorInDom(activeHighlightId, color);
      toolbar.currentColor = color;
    })();
  };

  toolbar.onNoteRequest = () => {
    openNoteDialog({
      initialNote: highlight.note,
      onSave: async (note) => {
        if (activeHighlightId === null) {
          return;
        }
        await updateHighlight(activeHighlightId, { note });
        syncHighlightNoteInDom(activeHighlightId, note);
      },
    });
  };

  toolbar.onDeleteRequest = () => {
    openDeleteConfirmDialog({
      onConfirm: async () => {
        if (activeHighlightId === null) {
          return;
        }
        const id = activeHighlightId;
        await deleteHighlight(id);
        removeHighlightFromDom(id);
        hideEditToolbar();
      },
    });
  };

  toolbar.onCloseRequest = () => {
    hideEditToolbar();
  };

  document.body.appendChild(toolbar);
  activeToolbar = toolbar;
  activeHighlightId = highlightId;

  const rect = getHighlightMarksRect(marks);
  requestAnimationFrame(() => {
    if (activeToolbar === toolbar) {
      positionToolbar(toolbar, rect);
    }
  });
}

function getHighlightIdFromEventTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const mark = target.closest('mark[data-markwell-id]');
  return mark?.getAttribute('data-markwell-id') ?? null;
}

function handleHighlightClick(event: MouseEvent): void {
  if (event.metaKey || event.ctrlKey) {
    return;
  }

  const highlightId = getHighlightIdFromEventTarget(event.target);
  if (highlightId === null) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  void showEditToolbar(highlightId);
}

const OVERLAY_DIALOG_TAGS = new Set([
  'markwell-note-dialog',
  'markwell-delete-confirm-dialog',
  'mw-upgrade-modal',
]);

function isOverlayDialogInPath(path: EventTarget[]): boolean {
  return path.some(
    (node) => node instanceof HTMLElement && OVERLAY_DIALOG_TAGS.has(node.localName),
  );
}

function handleOutsidePointerDown(event: MouseEvent): void {
  if (activeToolbar === null) {
    return;
  }

  const path = event.composedPath();
  if (path.includes(activeToolbar) || isOverlayDialogInPath(path)) {
    return;
  }

  hideEditToolbar();
}

export function initEditToolbar(): void {
  document.addEventListener(HIDE_TOOLBARS_EVENT, () => {
    hideEditToolbar();
  });

  document.addEventListener('click', handleHighlightClick, true);
  document.addEventListener('scroll', hideEditToolbar, true);
  document.addEventListener('mousedown', handleOutsidePointerDown, true);
}
