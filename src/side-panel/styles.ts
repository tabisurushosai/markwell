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

    .synthesis {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3);
      border-top: 1px solid var(--border);
      background: var(--surface);
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
      margin: 0;
      padding: var(--space-3) var(--space-3) var(--space-2);
      font-size: var(--font-size-tab);
      font-weight: 600;
      color: var(--text-muted);
    }

    .result-body {
      flex: 1;
      min-height: 120px;
      margin: 0;
      padding: 0 var(--space-3) var(--space-3);
      overflow: auto;
      font-size: var(--font-size-base);
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
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
  `,
];
