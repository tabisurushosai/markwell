import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('mw-options')
export class MwOptions extends LitElement {
  render() {
    return html`<p>Markwell Options</p>`;
  }
}

document.body.appendChild(document.createElement('mw-options'));
