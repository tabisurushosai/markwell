import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('mw-side-panel')
class MwSidePanel extends LitElement {
  render() {
    return html`<p>Markwell Side Panel</p>`;
  }
}

document.body.appendChild(document.createElement('mw-side-panel'));
