import { css } from 'lit';

import { accessibilityStyles } from '../shared/styles/accessibility.js';

/**
 * Popup デザイントークン（Lit CSS-in-JS）。
 * 子コンポーネントの Shadow DOM でも継承される CSS 変数を :host に定義する。
 */
export const popupDesignTokens = css`
  :host {
    /* カラー（既定: ダーク） */
    --bg: #1a1a1a;
    --surface: #242424;
    --surface-raised: #2e2e2e;
    --border: #333333;
    --text: #e0e0e0;
    --text-muted: #888;
    --accent: #ffd34e;

    --hl-yellow: rgba(255, 235, 59, 0.5);
    --hl-green: rgba(129, 199, 132, 0.5);
    --hl-pink: rgba(244, 143, 177, 0.5);
    --hl-blue: rgba(100, 181, 246, 0.5);
    --hl-orange: rgba(255, 183, 77, 0.5);
    --hl-purple: rgba(186, 104, 200, 0.5);

    /* スペーシング: 4 / 8 / 12 / 16 / 24 px */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 24px;

    /* タイポグラフィ */
    --font-family: system-ui, 'Hiragino Sans', 'Yu Gothic UI', 'Yu Gothic', sans-serif;
    --font-size-sm: 11px;
    --font-size-base: 13px;
    --font-size-tab: 12px;
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
  }

  :host-context(html[data-theme='light']) {
    --bg: #f4f4f5;
    --surface: #ffffff;
    --surface-raised: #ececee;
    --border: #d4d4d8;
    --text: #18181b;
    --text-muted: #71717a;
    --accent: #b8860b;
  }
`;

/** markwell-popup-root 用レイアウト + コンポーネントスタイル */
const popupLayoutStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 400px;
    height: 600px;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-family);
    font-size: var(--font-size-base);
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border-bottom: 1px solid var(--surface-raised);
    flex-shrink: 0;
  }

  .search {
    flex: 1;
    min-width: 0;
    padding: var(--space-2) 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text);
    font-family: inherit;
    font-size: var(--font-size-base);
  }

  .search::placeholder {
    color: var(--text-muted);
  }

  .search:focus {
    outline: 2px solid var(--accent);
    outline-offset: 0;
    border-color: var(--accent);
  }

  .tier-badge {
    flex-shrink: 0;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    background: var(--surface);
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .tier-badge[data-tier='TRIAL'] {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    line-height: 1.15;
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }

  .tier-badge[data-tier='TRIAL'][data-urgent] {
    color: #fff;
    border-color: #b71c1c;
    background: #c62828;
  }

  .tier-badge__tier {
    font-size: 10px;
  }

  .tier-badge__days {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0;
  }

  .tier-badge[data-tier='PREMIUM'] {
    color: var(--hl-purple);
    border-color: color-mix(in srgb, var(--hl-purple) 50%, var(--border));
    background: color-mix(in srgb, var(--hl-purple) 15%, var(--surface));
  }

  .tabs {
    display: flex;
    gap: 0;
    padding: 0 var(--space-3);
    border-bottom: 1px solid var(--surface-raised);
    flex-shrink: 0;
  }

  .tab {
    flex: 1;
    padding: 10px var(--space-1);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--text-muted);
    font-family: inherit;
    font-size: var(--font-size-tab);
    font-weight: 500;
    cursor: pointer;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: var(--text);
  }

  .tab[aria-selected='true'] {
    color: var(--text);
    border-bottom-color: var(--accent);
  }

  .main {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--space-3);
    scrollbar-width: thin;
    scrollbar-color: var(--text-muted) var(--surface);
  }

  .main::-webkit-scrollbar {
    width: 6px;
  }

  .main::-webkit-scrollbar-track {
    background: var(--surface);
  }

  .main::-webkit-scrollbar-thumb {
    background: var(--text-muted);
    border-radius: var(--radius-sm);
  }

  .panel-title {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-tab);
    font-weight: 600;
    color: var(--text-muted);
  }

  .placeholder {
    margin: 0;
    padding: var(--space-5) var(--space-3);
    text-align: center;
    color: var(--text-muted);
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }

  .project-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 10px var(--space-3);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  .project-name {
    font-weight: 500;
    color: var(--text);
  }

  .btn-open {
    flex-shrink: 0;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--text);
    font-family: inherit;
    font-size: var(--font-size-tab);
    cursor: pointer;
  }

  .btn-open:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .related-section {
    flex-shrink: 0;
    max-height: 40%;
    overflow: auto;
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--surface-raised);
    background: var(--surface);
    scrollbar-width: thin;
    scrollbar-color: var(--text-muted) var(--surface);
  }

  .related-section__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .related-section__title {
    margin: 0;
    font-size: var(--font-size-tab);
    font-weight: 600;
    color: var(--text);
  }

  .related-section__source {
    margin: var(--space-1) 0 0;
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    line-height: 1.35;
  }

  .related-section__close {
    flex-shrink: 0;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-raised);
    color: var(--text-muted);
    font-family: inherit;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .related-section__close:hover {
    color: var(--text);
    border-color: var(--accent);
  }

  .related-section__status {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-muted);
  }

  .related-section__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .footer {
    display: flex;
    gap: 6px;
    padding: 10px var(--space-3);
    border-top: 1px solid var(--surface-raised);
    flex-shrink: 0;
  }

  .footer-btn {
    flex: 1;
    padding: var(--space-2) 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text-muted);
    font-family: inherit;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .footer-btn:hover {
    background: var(--surface-raised);
    color: var(--text);
    border-color: var(--accent);
  }

  .footer-theme-btn {
    flex: 0 0 auto;
    min-width: 36px;
    padding: var(--space-2);
    font-size: 16px;
    line-height: 1;
  }

`;

export const popupStyles = [popupDesignTokens, accessibilityStyles, popupLayoutStyles];
