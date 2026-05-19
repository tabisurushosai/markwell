import { css } from 'lit';

import { accessibilityStyles } from '../shared/styles/accessibility.js';

/** Shared options page tokens (AA contrast) + a11y focus / reduced-motion */
export const optionsAccessibilityStyles = [
  accessibilityStyles,
  css`
    :host {
      --accent: #ffd34e;
      --bg: #1a1a1a;
      --text: #e0e0e0;
    }

    :host-context(html[data-theme='light']) {
      --accent: #b8860b;
      --bg: #f4f4f5;
      --text: #18181b;
    }
  `,
];
