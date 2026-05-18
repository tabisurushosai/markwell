import { LitElement, css, html } from 'lit';
import { customElement } from 'lit/decorators.js';

import {
  MARKWELL_OSS_LICENSES_URL,
  MARKWELL_PRIVACY_POLICY_URL,
  MARKWELL_REPOSITORY_URL,
  MARKWELL_SUPPORT_EMAIL,
  MARKWELL_SUPPORT_MAILTO,
  MARKWELL_TERMS_URL,
} from '../shared/constants/about.js';
import { APP_VERSION } from '../shared/constants/version.js';
import { optionsAccessibilityStyles } from './styles.js';

@customElement('mw-about-section')
export class MwAboutSection extends LitElement {
  static styles = [...optionsAccessibilityStyles, css`
    :host {
      display: block;
    }

    .meta {
      margin: 0 0 24px;
      padding: 12px 14px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #242424;
    }

    .version {
      margin: 0;
      font-size: 14px;
      color: #e0e0e0;
    }

    .version strong {
      color: #ffd34e;
      font-weight: 600;
    }

    .tagline {
      margin: 8px 0 0;
      font-size: 12px;
      color: #888;
      line-height: 1.5;
    }

    .links {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .links li + li {
      margin-top: 10px;
    }

    .links a {
      color: #ffd34e;
      font-size: 14px;
      text-decoration: none;
    }

    .links a:hover {
      text-decoration: underline;
    }

    .links .external::after {
      content: ' ↗';
      font-size: 12px;
      opacity: 0.8;
    }
  `];

  private openExternal(url: string): void {
    void chrome.tabs.create({ url });
  }

  render() {
    return html`
      <div class="meta">
        <p class="version">バージョン: <strong>${APP_VERSION}</strong></p>
        <p class="tagline">Markwell — ウェブハイライトと AI 支援のための Chrome 拡張機能です。</p>
      </div>

      <ul class="links">
        <li>
          <a
            class="external"
            href=${MARKWELL_REPOSITORY_URL}
            @click=${(event: Event) => {
              event.preventDefault();
              this.openExternal(MARKWELL_REPOSITORY_URL);
            }}
          >
            リポジトリ (GitHub)
          </a>
        </li>
        <li>
          <a
            class="external"
            href=${MARKWELL_PRIVACY_POLICY_URL}
            @click=${(event: Event) => {
              event.preventDefault();
              this.openExternal(MARKWELL_PRIVACY_POLICY_URL);
            }}
          >
            プライバシーポリシー
          </a>
        </li>
        <li>
          <a
            class="external"
            href=${MARKWELL_TERMS_URL}
            @click=${(event: Event) => {
              event.preventDefault();
              this.openExternal(MARKWELL_TERMS_URL);
            }}
          >
            利用規約
          </a>
        </li>
        <li>
          <a
            class="external"
            href=${MARKWELL_OSS_LICENSES_URL}
            @click=${(event: Event) => {
              event.preventDefault();
              this.openExternal(MARKWELL_OSS_LICENSES_URL);
            }}
          >
            OSS ライセンス
          </a>
        </li>
        <li>
          <a href=${MARKWELL_SUPPORT_MAILTO}>サポート問い合わせ (${MARKWELL_SUPPORT_EMAIL})</a>
        </li>
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-about-section': MwAboutSection;
  }
}
