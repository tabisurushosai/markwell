import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('mw-popup')
export class MwPopup extends LitElement {
  render() {
    return html`<p>Markwell Popup</p>`;
  }
}

document.body.appendChild(document.createElement('mw-popup'));
