import { css, html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';

/** GIF-style demo: cursor sweep → selection → yellow highlight (SVG + CSS). */
@customElement('mw-onboarding-demo')
export class MwOnboardingDemo extends LitElement {
  static styles = css`
    :host {
      display: block;
      margin: 0 0 20px;
    }

    .frame {
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #444;
      background: #1a1a1a;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
    }

    .highlight-group {
      opacity: 0;
      animation: highlight-in 4s ease-in-out infinite;
    }

    .selection-group {
      opacity: 0;
      animation: select-sweep 4s ease-in-out infinite;
    }

    .cursor-group {
      animation: cursor-move 4s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      .highlight-group,
      .selection-group,
      .cursor-group {
        animation: none;
        opacity: 1;
        transform: translate(212px, 118px);
      }
    }

    @keyframes cursor-move {
      0%,
      10% {
        transform: translate(52px, 112px);
      }
      30% {
        transform: translate(200px, 112px);
      }
      40%,
      100% {
        transform: translate(212px, 118px);
      }
    }

    @keyframes select-sweep {
      0%,
      22% {
        opacity: 0;
      }
      30%,
      38% {
        opacity: 1;
      }
      46%,
      100% {
        opacity: 0;
      }
    }

    @keyframes highlight-in {
      0%,
      40% {
        opacity: 0;
      }
      50%,
      75% {
        opacity: 1;
      }
      90%,
      100% {
        opacity: 0.5;
      }
    }
  `;

  override render() {
    return html`
      <div class="frame" aria-hidden="true">
        <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
          <rect fill="#2a2a2a" width="400" height="32" />
          <rect fill="#333" x="48" y="8" width="280" height="16" rx="4" />
          <rect fill="#242424" y="32" width="400" height="168" />
          <rect fill="#555" x="40" y="56" width="200" height="8" rx="2" />
          <rect fill="#555" x="40" y="76" width="320" height="8" rx="2" />
          <rect fill="#555" x="40" y="96" width="280" height="8" rx="2" />
          <rect fill="#555" x="40" y="136" width="240" height="8" rx="2" />

          <g class="selection-group">
            <rect
              fill="rgba(120, 180, 255, 0.25)"
              stroke="#7ab8ff"
              stroke-width="1"
              x="118"
              y="108"
              width="140"
              height="22"
              rx="3"
            />
          </g>

          <g class="highlight-group">
            <rect
              fill="rgba(255, 211, 78, 0.45)"
              stroke="#ffd34e"
              stroke-width="1"
              x="118"
              y="108"
              width="140"
              height="22"
              rx="3"
            />
          </g>

          <g class="cursor-group">
            <path fill="#e8e8e8" d="M0 0 L0 14 L4 10 L7 16 L10 14 L7 8 L12 8 Z" />
          </g>
        </svg>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-onboarding-demo': MwOnboardingDemo;
  }
}
