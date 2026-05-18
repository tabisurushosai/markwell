import { css } from 'lit';

/**
 * WCAG AA: --text (#e0e0e0) on --bg (#1a1a1a) ≈ 13:1 (popup design tokens).
 * Import into Lit `static styles` arrays for popup, side panel, options, onboarding, content toolbars.
 */
export const accessibilityStyles = css`
  :where(button, [role='button'], a, input, select, textarea):focus {
    outline: none;
  }

  :where(button, [role='button'], a, input, select, textarea):focus-visible {
    outline: 2px solid var(--accent, #ffd34e);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    :host,
    :host *,
    :host *::before,
    :host *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;
