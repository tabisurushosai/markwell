import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('mw-onboarding')
class MwOnboarding extends LitElement {
  render() {
    return html`<p>Markwell Onboarding</p>`;
  }
}

document.body.appendChild(document.createElement('mw-onboarding'));
