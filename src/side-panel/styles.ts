import { css } from 'lit';

import { popupDesignTokens } from '../popup/styles.js';

export const sidePanelStyles = [
  popupDesignTokens,
  css`
    :host {
      display: block;
      box-sizing: border-box;
      min-width: 400px;
      width: 100%;
      height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-family);
      font-size: var(--font-size-base);
    }

    .shell {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      width: 100%;
      min-width: 400px;
      height: 100%;
      resize: horizontal;
      overflow: hidden;
    }

    .workspace {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    @media (min-width: 1024px) {
      .workspace {
        flex-direction: row;
      }
    }

    .main-column {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
    }

    .header {
      flex-shrink: 0;
      padding: var(--space-3);
      border-bottom: 1px solid var(--border);
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .header-top .panel-title {
      margin: 0;
    }

    .project-select {
      width: 100%;
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-base);
    }

    .highlights {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: var(--space-3);
      scrollbar-width: thin;
      scrollbar-color: var(--text-muted) var(--surface);
    }

    .highlights::-webkit-scrollbar {
      width: 6px;
    }

    .highlights::-webkit-scrollbar-thumb {
      background: var(--text-muted);
      border-radius: var(--radius-sm);
    }

    .panel-title {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-tab);
      font-weight: 600;
      color: var(--text-muted);
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

    .highlight-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .highlight-item {
      display: flex;
      gap: var(--space-2);
      align-items: flex-start;
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      outline: none;
    }

    .highlight-item--focused {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
    }

    .highlight-item--ghost {
      opacity: 0.35;
    }

    .drop-line {
      height: 2px;
      margin: calc(-1 * var(--space-1)) 0;
      padding: 0;
      border: none;
      border-radius: 1px;
      background: var(--accent);
      list-style: none;
    }

    .drag-handle {
      flex-shrink: 0;
      width: 24px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-raised);
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1;
      cursor: grab;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .drag-handle:hover {
      color: var(--text);
      border-color: var(--accent);
    }

    .highlight-marker {
      flex-shrink: 0;
      width: 4px;
      align-self: stretch;
      border-radius: var(--radius-sm);
    }

    .status-toast {
      margin: 0 0 var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--accent);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--accent) 12%, var(--surface));
      color: var(--text);
      font-size: var(--font-size-sm);
      line-height: 1.45;
    }

    .highlight-body {
      flex: 1;
      min-width: 0;
    }

    .highlight-text {
      margin: 0;
      font-size: var(--font-size-base);
      line-height: 1.45;
      word-break: break-word;
    }

    .highlight-meta {
      margin: var(--space-1) 0 0;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .reorder {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-shrink: 0;
    }

    .reorder-btn {
      width: 28px;
      height: 24px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-raised);
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
    }

    .reorder-btn:hover:not(:disabled) {
      color: var(--text);
      border-color: var(--accent);
    }

    .reorder-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .highlight-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .color-label {
      display: flex;
      align-items: center;
    }

    .color-select {
      padding: 4px var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .card-btn {
      padding: 4px var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface-raised);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .card-btn:hover {
      border-color: var(--accent);
    }

    .card-btn--exclude {
      color: #e57373;
      border-color: color-mix(in srgb, #e57373 40%, var(--border));
    }

    .card-btn--exclude:hover {
      border-color: #e57373;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .bottom-panel {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      min-height: 200px;
      max-height: min(42vh, 380px);
      border-top: 1px solid var(--border);
      background: var(--surface);
    }

    @media (min-width: 1024px) {
      .bottom-panel {
        max-height: none;
        flex: 0 0 min(38%, 340px);
      }
    }

    .bottom-tabs {
      flex-shrink: 0;
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border);
    }

    .bottom-tab {
      flex: 1;
      padding: 10px var(--space-2);
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-family: inherit;
      font-size: var(--font-size-tab);
      font-weight: 600;
      cursor: pointer;
      margin-bottom: -1px;
    }

    .bottom-tab:hover {
      color: var(--text);
    }

    .bottom-tab--active,
    .bottom-tab[aria-selected='true'] {
      color: var(--text);
      border-bottom-color: var(--accent);
    }

    .bottom-tab-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-height: 0;
      padding: var(--space-3);
    }

    .bottom-tab-panel--qa {
      padding-bottom: var(--space-2);
    }

    .bottom-tab-panel[hidden] {
      display: none;
    }

    .qa-messages {
      flex: 1;
      min-height: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
      scrollbar-width: thin;
      scrollbar-color: var(--text-muted) var(--surface);
    }

    .qa-empty {
      margin: auto;
      padding: var(--space-3);
      text-align: center;
      color: var(--text-muted);
      font-size: var(--font-size-sm);
      line-height: 1.5;
    }

    .qa-message {
      max-width: 92%;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-lg);
      font-size: var(--font-size-sm);
      line-height: 1.5;
      word-break: break-word;
    }

    .qa-message--user {
      align-self: flex-end;
      background: color-mix(in srgb, var(--accent) 16%, var(--surface-raised));
      border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
    }

    .qa-message--assistant {
      align-self: flex-start;
      background: var(--surface-raised);
      border: 1px solid var(--border);
    }

    .qa-message__text {
      margin: 0;
      white-space: pre-wrap;
    }

    .qa-message__placeholder {
      margin: 0;
      color: var(--text-muted);
    }

    .qa-composer {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .qa-input {
      width: 100%;
      min-height: 56px;
      max-height: 120px;
      box-sizing: border-box;
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-base);
      resize: vertical;
    }

    .qa-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .synthesis-label {
      margin: 0;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--text-muted);
    }

    .synthesis-prompt {
      width: 100%;
      min-height: 72px;
      box-sizing: border-box;
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-base);
      resize: vertical;
    }

    .synthesis-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .btn {
      flex: 1;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }

    .btn:hover:not(:disabled) {
      border-color: var(--accent);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn--primary {
      background: color-mix(in srgb, var(--accent) 18%, var(--surface-raised));
      border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
      color: var(--text);
      font-weight: 600;
    }

    .btn--compact {
      flex: 0 1 auto;
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-size-sm);
    }

    .result-panel {
      display: none;
      flex-direction: column;
      min-height: 0;
      border-top: 1px solid var(--border);
      background: var(--surface-raised);
    }

    .result-panel--visible {
      display: flex;
    }

    @media (min-width: 1024px) {
      .result-panel {
        flex: 0 0 min(42%, 480px);
        border-top: none;
        border-left: 1px solid var(--border);
      }

      .result-panel--visible {
        display: flex;
      }
    }

    .result-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin: 0;
      padding: var(--space-3) var(--space-3) var(--space-2);
    }

    .result-header__title {
      margin: 0;
      font-size: var(--font-size-tab);
      font-weight: 600;
      color: var(--text-muted);
    }

    .result-header__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .export-menu-wrap {
      position: relative;
    }

    .export-menu-trigger {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .export-menu {
      position: absolute;
      top: calc(100% + var(--space-1));
      right: 0;
      z-index: 50;
      min-width: 220px;
      padding: var(--space-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-raised);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }

    .export-menu-item {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-2);
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-sm);
      text-align: left;
      cursor: pointer;
    }

    .export-menu-item:hover {
      background: color-mix(in srgb, var(--accent) 10%, transparent);
    }

    .export-menu-item__label {
      flex: 1;
    }

    .premium-badge {
      flex-shrink: 0;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .history-card__actions .export-menu-wrap {
      flex: 1 1 100%;
    }

    .history-card__actions .export-menu-trigger {
      width: 100%;
    }

    .result-body {
      flex: 1;
      min-height: 120px;
      margin: 0;
      padding: 0 var(--space-3) var(--space-3);
      overflow: auto;
    }

    .result-placeholder {
      margin: 0;
      color: var(--text-muted);
      font-size: var(--font-size-sm);
    }

    .result-error {
      margin: 0;
      color: #e57373;
      font-size: var(--font-size-base);
      line-height: 1.5;
    }

    .result-badge {
      margin-left: var(--space-2);
      padding: 2px var(--space-1);
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--accent) 20%, transparent);
      color: var(--accent);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }

    .dialog-message {
      margin: 0 0 var(--space-3);
      font-size: var(--font-size-base);
      line-height: 1.5;
      color: var(--text-muted);
    }

    .dialog--history {
      width: min(520px, 100%);
      max-height: min(80vh, 640px);
      display: flex;
      flex-direction: column;
    }

    .history-list {
      list-style: none;
      margin: 0 0 var(--space-3);
      padding: 0;
      overflow: auto;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .history-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
    }

    .history-card__main {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      width: 100%;
      margin: 0;
      padding: 0;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .history-card__main:hover {
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }

    .history-card__main:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    .history-card__meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .history-card__model {
      font-size: var(--font-size-sm);
      color: var(--text-muted);
    }

    .history-card__preview {
      margin: 0;
      font-size: var(--font-size-sm);
      line-height: 1.45;
      color: var(--text);
    }

    .history-card__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .history-card__actions .btn {
      flex: 1 1 calc(33% - var(--space-2));
      min-width: 6.5rem;
    }

    @media (max-width: 1023px) {
      .result-panel--visible {
        max-height: 40vh;
      }
    }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
      background: rgba(0, 0, 0, 0.5);
      box-sizing: border-box;
    }

    .dialog {
      width: min(360px, 100%);
      padding: var(--space-4);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface-raised);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
    }

    .dialog-title {
      margin: 0 0 var(--space-3);
      font-size: var(--font-size-base);
      font-weight: 600;
    }

    .dialog-input {
      width: 100%;
      box-sizing: border-box;
      padding: var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: var(--font-size-base);
    }

    .dialog-error {
      margin: var(--space-2) 0 0;
      font-size: var(--font-size-sm);
      color: #e57373;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }

    .card-btn--exclude {
      color: #e57373;
    }
  `,
];
