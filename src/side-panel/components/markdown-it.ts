import MarkdownIt from 'markdown-it';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

const md = new MarkdownIt();

@customElement('markdown-it')
export class MarkdownItElement extends LitElement {
  @property({ type: String }) content = '';

  static styles = css`
    :host {
      display: block;
    }

    .markdown-body {
      font-size: var(--font-size-base, 14px);
      line-height: 1.55;
      word-break: break-word;
      color: inherit;
    }

    .markdown-body :is(h1, h2, h3, h4) {
      margin: 1em 0 0.5em;
      line-height: 1.3;
    }

    .markdown-body h1 {
      font-size: 1.35em;
    }

    .markdown-body h2 {
      font-size: 1.2em;
    }

    .markdown-body h3 {
      font-size: 1.05em;
    }

    .markdown-body p {
      margin: 0.5em 0;
    }

    .markdown-body ul,
    .markdown-body ol {
      margin: 0.5em 0;
      padding-left: 1.4em;
    }

    .markdown-body blockquote {
      margin: 0.5em 0;
      padding-left: 0.75em;
      border-left: 3px solid var(--accent, #7c9cff);
      color: var(--text-muted, #9aa0a6);
    }

    .markdown-body code {
      padding: 0.1em 0.35em;
      border-radius: 4px;
      background: color-mix(in srgb, var(--text, #e8eaed) 8%, transparent);
      font-size: 0.92em;
    }

    .markdown-body pre {
      margin: 0.5em 0;
      padding: 0.75em;
      overflow: auto;
      border-radius: 6px;
      background: color-mix(in srgb, var(--text, #e8eaed) 6%, transparent);
    }

    .markdown-body pre code {
      padding: 0;
      background: transparent;
    }

    .markdown-body a {
      color: var(--accent, #7c9cff);
    }
  `;

  render() {
    const htmlOutput = this.content === '' ? '' : md.render(this.content);
    return html`<div class="markdown-body">${unsafeHTML(htmlOutput)}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'markdown-it': MarkdownItElement;
  }
}
