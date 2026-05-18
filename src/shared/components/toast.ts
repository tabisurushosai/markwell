import { css, html, LitElement, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { accessibilityStyles } from '../styles/accessibility.js';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export const MW_TOAST_EVENT = 'mw-toast';

export const MAX_VISIBLE_TOASTS = 3;

export const TOAST_DURATION_MS: Record<ToastKind, number> = {
  info: 3000,
  success: 3000,
  warning: 3000,
  error: 5000,
};

export type MwToastDetail = {
  message: string;
  kind?: ToastKind;
};

type ToastEntry = {
  id: string;
  message: string;
  kind: ToastKind;
  phase: 'visible' | 'leaving';
};

export function dispatchToast(
  target: EventTarget,
  message: string,
  kind: ToastKind = 'info',
): void {
  if (message.trim() === '') {
    return;
  }
  target.dispatchEvent(
    new CustomEvent(MW_TOAST_EVENT, {
      bubbles: true,
      composed: true,
      detail: { message, kind } satisfies MwToastDetail,
    }),
  );
}

export function toastFrom(
  element: HTMLElement,
  message: string,
  kind: ToastKind = 'info',
): void {
  dispatchToast(element, message, kind);
}

/** @internal Exported for unit tests */
export class ToastQueue {
  private readonly visible: ToastEntry[] = [];

  private readonly pending: Array<{ message: string; kind: ToastKind }> = [];

  enqueue(message: string, kind: ToastKind): ToastEntry | null {
    if (this.visible.length < MAX_VISIBLE_TOASTS) {
      const entry: ToastEntry = {
        id: crypto.randomUUID(),
        message,
        kind,
        phase: 'visible',
      };
      this.visible.push(entry);
      return entry;
    }
    this.pending.push({ message, kind });
    return null;
  }

  markLeaving(id: string): ToastEntry | null {
    const entry = this.visible.find((item) => item.id === id);
    if (entry === undefined) {
      return null;
    }
    entry.phase = 'leaving';
    return entry;
  }

  remove(id: string): ToastEntry | null {
    const index = this.visible.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const [removed] = this.visible.splice(index, 1);
    const next = this.pending.shift();
    if (next !== undefined) {
      this.enqueue(next.message, next.kind);
    }
    return removed;
  }

  getVisible(): readonly ToastEntry[] {
    return this.visible;
  }

  getPendingCount(): number {
    return this.pending.length;
  }
}

@customElement('mw-toast-stack')
export class MwToastStack extends LitElement {
  @state() private entries: ToastEntry[] = [];

  private readonly queue = new ToastQueue();

  private readonly dismissTimers = new Map<string, number>();

  static styles = [
    accessibilityStyles,
    css`
      :host {
        position: fixed;
        z-index: 300;
        display: flex;
        flex-direction: column-reverse;
        align-items: stretch;
        gap: 8px;
        pointer-events: none;
        box-sizing: border-box;
        --toast-text: #e0e0e0;
        --toast-bg: #2e2e2e;
        --toast-border: #555;
        --toast-accent: #ffd34e;
      }

      :host([data-placement='popup']) {
        left: 12px;
        right: 12px;
        bottom: 56px;
      }

      :host([data-placement='side-panel']) {
        left: 12px;
        right: 12px;
        bottom: 16px;
        max-width: 360px;
      }

      :host([data-placement='options']) {
        right: 24px;
        bottom: 24px;
        width: min(360px, calc(100vw - 48px));
      }

      .toast {
        margin: 0;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid var(--toast-border);
        background: var(--toast-bg);
        color: var(--toast-text);
        font-family:
          system-ui,
          -apple-system,
          'Segoe UI',
          sans-serif;
        font-size: 13px;
        line-height: 1.45;
        text-align: left;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        opacity: 1;
        transform: translateY(0);
        transition:
          opacity 0.25s ease,
          transform 0.25s ease;
      }

      .toast--leaving {
        opacity: 0;
        transform: translateY(6px);
      }

      .toast--success {
        border-color: color-mix(in srgb, #7dd87d 55%, var(--toast-border));
        color: #c8f0c8;
      }

      .toast--warning {
        border-color: color-mix(in srgb, #ffd34e 55%, var(--toast-border));
        color: #ffe9a8;
      }

      .toast--error {
        border-color: #8b3a3a;
        color: #f0a0a0;
      }

      .toast--info {
        border-color: color-mix(in srgb, var(--toast-accent) 45%, var(--toast-border));
        color: var(--toast-accent);
      }

      @media (prefers-reduced-motion: reduce) {
        .toast {
          transition: none;
        }

        .toast--leaving {
          opacity: 0;
          transform: none;
        }
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    const host = this.getEventHost();
    host?.addEventListener(MW_TOAST_EVENT, this.onMwToast);
  }

  disconnectedCallback(): void {
    const host = this.getEventHost();
    host?.removeEventListener(MW_TOAST_EVENT, this.onMwToast);
    for (const timer of this.dismissTimers.values()) {
      window.clearTimeout(timer);
    }
    this.dismissTimers.clear();
    super.disconnectedCallback();
  }

  /** Imperative API for hosts that prefer direct calls */
  show(message: string, kind: ToastKind = 'info'): void {
    this.addToast(message, kind);
  }

  private getEventHost(): HTMLElement | null {
    const root = this.getRootNode();
    if (root instanceof ShadowRoot) {
      return root.host as HTMLElement;
    }
    return this.parentElement;
  }

  private readonly onMwToast = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail = event.detail as MwToastDetail;
    if (typeof detail.message !== 'string' || detail.message.trim() === '') {
      return;
    }
    this.addToast(detail.message, detail.kind ?? 'info');
  };

  private addToast(message: string, kind: ToastKind): void {
    const entry = this.queue.enqueue(message, kind);
    if (entry === null) {
      return;
    }
    this.syncVisible();
    const duration = TOAST_DURATION_MS[kind];
    const timer = window.setTimeout(() => {
      this.dismissTimers.delete(entry.id);
      this.beginLeave(entry.id);
    }, duration);
    this.dismissTimers.set(entry.id, timer);
  }

  private beginLeave(id: string): void {
    const entry = this.queue.markLeaving(id);
    if (entry === null) {
      return;
    }
    this.syncVisible();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.setTimeout(() => {
        this.finishLeave(id);
      }, 0);
    }
  }

  private finishLeave(id: string): void {
    this.queue.remove(id);
    this.syncVisible();
  }

  private syncVisible(): void {
    this.entries = [...this.queue.getVisible()];
  }

  private handleTransitionEnd(event: TransitionEvent, id: string): void {
    if (event.propertyName !== 'opacity') {
      return;
    }
    const entry = this.entries.find((item) => item.id === id);
    if (entry?.phase !== 'leaving') {
      return;
    }
    this.finishLeave(id);
  }

  override render() {
    if (this.entries.length === 0) {
      return nothing;
    }

    return html`
      <div class="stack">
        ${this.entries.map(
          (entry) => html`
            <p
              class="toast toast--${entry.kind} ${entry.phase === 'leaving' ? 'toast--leaving' : ''}"
              role=${entry.kind === 'error' ? 'alert' : 'status'}
              @transitionend=${(event: TransitionEvent) => {
                this.handleTransitionEnd(event, entry.id);
              }}
            >
              ${entry.message}
            </p>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-toast-stack': MwToastStack;
  }
}
