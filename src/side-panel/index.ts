import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { listHighlights } from '../shared/storage/highlights.js';
import {
  listProjects,
  reorderHighlightsInProject,
} from '../shared/storage/projects.js';
import { getSettings } from '../shared/storage/settings.js';
import type { Highlight } from '../shared/types/highlight.js';
import type { Project } from '../shared/types/project.js';
import { applyDocumentTheme, resolveEffectiveTheme } from '../popup/utils/theme.js';
import { orderHighlightsForProject } from './utils/project-highlights.js';
import { sidePanelStyles } from './styles.js';

@customElement('markwell-side-panel-root')
export class MarkwellSidePanelRoot extends LitElement {
  @state() private projects: Project[] = [];

  @state() private selectedProjectId = '';

  @state() private highlights: Highlight[] = [];

  @state() private loading = true;

  @state() private synthesisPrompt = '';

  @state() private synthesisResult = '';

  @state() private resultVisible = false;

  @state() private synthesizing = false;

  private systemThemeQuery: MediaQueryList | null = null;

  static styles = sidePanelStyles;

  connectedCallback(): void {
    super.connectedCallback();
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: light)');
    this.systemThemeQuery.addEventListener('change', this.onSystemThemeChange);
    void this.bootstrap();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.systemThemeQuery?.removeEventListener('change', this.onSystemThemeChange);
    this.systemThemeQuery = null;
  }

  private readonly onSystemThemeChange = (): void => {
    void this.applyThemeFromSettings();
  };

  private async bootstrap(): Promise<void> {
    await this.applyThemeFromSettings();
    await this.loadProjects();
  }

  private async applyThemeFromSettings(): Promise<void> {
    const settings = await getSettings();
    applyDocumentTheme(resolveEffectiveTheme(settings.theme));
  }

  private async loadProjects(): Promise<void> {
    this.loading = true;
    const projects = await listProjects();
    this.projects = projects.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    if (this.projects.length === 0) {
      this.selectedProjectId = '';
      this.highlights = [];
      this.loading = false;
      return;
    }
    if (
      this.selectedProjectId === '' ||
      !this.projects.some((project) => project.id === this.selectedProjectId)
    ) {
      this.selectedProjectId = this.projects[0].id;
    }
    await this.loadHighlightsForProject();
    this.loading = false;
  }

  private async loadHighlightsForProject(): Promise<void> {
    const project = this.projects.find((item) => item.id === this.selectedProjectId);
    if (project === undefined) {
      this.highlights = [];
      return;
    }
    const items = await listHighlights({ project_id: project.id });
    this.highlights = orderHighlightsForProject(items, project);
  }

  private onProjectChange(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    this.selectedProjectId = select.value;
    void this.loadHighlightsForProject();
  }

  private async persistHighlightOrder(nextOrder: string[]): Promise<void> {
    if (this.selectedProjectId === '') {
      return;
    }
    await reorderHighlightsInProject(this.selectedProjectId, nextOrder);
    const project = this.projects.find((item) => item.id === this.selectedProjectId);
    if (project === undefined) {
      return;
    }
    project.highlight_order = nextOrder;
    this.highlights = orderHighlightsForProject(this.highlights, project);
  }

  private moveHighlight(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= this.highlights.length) {
      return;
    }
    const next = [...this.highlights];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    this.highlights = next;
    void this.persistHighlightOrder(next.map((highlight) => highlight.id));
  }

  private onSynthesisPromptInput(event: Event): void {
    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }
    this.synthesisPrompt = textarea.value;
  }

  private handleSynthesize(): void {
    if (this.synthesisPrompt.trim() === '') {
      return;
    }
    this.synthesizing = true;
    this.resultVisible = true;
    this.synthesisResult = '（合成機能は次のフェーズで実装します）';
    this.synthesizing = false;
  }

  private handleCancelSynthesis(): void {
    this.resultVisible = false;
    this.synthesisResult = '';
    this.synthesizing = false;
  }

  private renderHighlightList() {
    if (this.loading) {
      return html`<p class="empty">読み込み中…</p>`;
    }
    if (this.projects.length === 0) {
      return html`<p class="empty">プロジェクトがありません。ポップアップから作成してください。</p>`;
    }
    if (this.highlights.length === 0) {
      return html`<p class="empty">このプロジェクトにハイライトがありません</p>`;
    }

    return html`
      <ul class="highlight-list">
        ${this.highlights.map(
          (highlight, index) => html`
            <li class="highlight-item">
              <div class="reorder">
                <button
                  type="button"
                  class="reorder-btn"
                  aria-label="上へ"
                  ?disabled=${index === 0}
                  @click=${() => {
                    this.moveHighlight(index, -1);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="reorder-btn"
                  aria-label="下へ"
                  ?disabled=${index === this.highlights.length - 1}
                  @click=${() => {
                    this.moveHighlight(index, 1);
                  }}
                >
                  ↓
                </button>
              </div>
              <div>
                <p class="highlight-text">${highlight.selected_text}</p>
                <p class="highlight-meta">${highlight.page_title} · ${highlight.domain}</p>
              </div>
            </li>
          `,
        )}
      </ul>
    `;
  }

  render() {
    return html`
      <div class="shell">
        <div class="workspace">
          <div class="main-column">
            <header class="header">
              <label class="panel-title" for="project-select">プロジェクト</label>
              <select
                id="project-select"
                class="project-select"
                .value=${this.selectedProjectId}
                ?disabled=${this.projects.length === 0}
                @change=${(event: Event) => {
                  this.onProjectChange(event);
                }}
              >
                ${this.projects.length === 0
                  ? html`<option value="">プロジェクトなし</option>`
                  : this.projects.map(
                      (project) => html`
                        <option value=${project.id}>
                          ${project.cover_emoji} ${project.name}
                        </option>
                      `,
                    )}
              </select>
            </header>

            <section class="highlights" aria-label="ハイライト一覧">
              <h2 class="panel-title">ハイライト</h2>
              ${this.renderHighlightList()}
            </section>

            <section class="synthesis" aria-label="合成プロンプト">
              <p class="synthesis-label">合成プロンプト</p>
              <textarea
                class="synthesis-prompt"
                placeholder="プロジェクトのハイライトをどうまとめるか指示してください…"
                .value=${this.synthesisPrompt}
                @input=${(event: Event) => {
                  this.onSynthesisPromptInput(event);
                }}
              ></textarea>
              <div class="synthesis-actions">
                <button
                  type="button"
                  class="btn btn--primary"
                  ?disabled=${this.synthesizing || this.synthesisPrompt.trim() === ''}
                  @click=${() => {
                    this.handleSynthesize();
                  }}
                >
                  合成する
                </button>
                <button
                  type="button"
                  class="btn"
                  ?disabled=${!this.resultVisible && this.synthesisResult === ''}
                  @click=${() => {
                    this.handleCancelSynthesis();
                  }}
                >
                  キャンセル
                </button>
              </div>
            </section>
          </div>

          <aside
            class="result-panel ${this.resultVisible ? 'result-panel--visible' : ''}"
            aria-label="合成結果"
            aria-hidden=${!this.resultVisible}
          >
            ${this.resultVisible
              ? html`
                  <h2 class="result-header">合成結果</h2>
                  <pre class="result-body">${this.synthesisResult}</pre>
                `
              : nothing}
          </aside>
        </div>
      </div>
    `;
  }
}

document.body.appendChild(document.createElement('markwell-side-panel-root'));

declare global {
  interface HTMLElementTagNameMap {
    'markwell-side-panel-root': MarkwellSidePanelRoot;
  }
}
