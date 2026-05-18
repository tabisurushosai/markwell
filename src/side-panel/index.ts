import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { listHighlights, updateHighlight } from '../shared/storage/highlights.js';
import { getCurrentTier } from '../shared/storage/license.js';
import {
  assertProjectLimit,
  createProject,
  getProject,
  listProjects,
  ProjectLimitError,
  removeHighlightFromProject,
  reorderHighlightsInProject,
} from '../shared/storage/projects.js';
import { getLastProjectId, setLastProjectId } from '../shared/storage/ui-state.js';
import { getSettings } from '../shared/storage/settings.js';
import type { Highlight } from '../shared/types/highlight.js';
import type { HighlightColor } from '../shared/types/highlight.js';
import type { Project } from '../shared/types/project.js';
import { applyDocumentTheme, resolveEffectiveTheme } from '../popup/utils/theme.js';
import {
  jumpToHighlightFromSidePanel,
  notifyHighlightColorOnOpenTabs,
} from './utils/highlight-actions.js';
import { computeInsertIndex, reorderByIndex } from './utils/drag-reorder.js';
import { orderHighlightsForProject } from './utils/project-highlights.js';
import { sidePanelStyles } from './styles.js';

const NEW_PROJECT_SENTINEL = '__markwell_new_project__';

const HIGHLIGHT_COLORS: readonly HighlightColor[] = [
  'yellow',
  'green',
  'pink',
  'blue',
  'orange',
];

const COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: '黄',
  green: '緑',
  pink: 'ピンク',
  blue: '青',
  orange: 'オレンジ',
};

const COLOR_VAR: Record<HighlightColor, string> = {
  yellow: 'var(--hl-yellow)',
  green: 'var(--hl-green)',
  pink: 'var(--hl-pink)',
  blue: 'var(--hl-blue)',
  orange: 'var(--hl-orange)',
};

const EMPTY_PROJECT_HIGHLIGHTS_MESSAGE =
  'このプロジェクトにはハイライトがありません。popup からハイライトを右クリック → プロジェクトに追加 で入れられます';

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

  @state() private createDialogOpen = false;

  @state() private newProjectName = '';

  @state() private createError = '';

  @state() private statusMessage = '';

  @state() private dragSourceId: string | null = null;

  @state() private dropInsertIndex = -1;

  @state() private focusedHighlightId: string | null = null;

  private systemThemeQuery: MediaQueryList | null = null;

  private statusTimer: number | undefined;

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
    if (this.statusTimer !== undefined) {
      window.clearTimeout(this.statusTimer);
    }
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
    const lastId = await getLastProjectId();
    if (lastId !== null && this.projects.some((project) => project.id === lastId)) {
      this.selectedProjectId = lastId;
    } else if (
      this.selectedProjectId === '' ||
      !this.projects.some((project) => project.id === this.selectedProjectId)
    ) {
      this.selectedProjectId = this.projects[0].id;
    }
    await this.loadHighlightsForProject();
    await setLastProjectId(this.selectedProjectId);
    this.loading = false;
  }

  private async loadHighlightsForProject(): Promise<void> {
    if (this.selectedProjectId === '') {
      this.highlights = [];
      return;
    }
    const project = await getProject(this.selectedProjectId);
    if (project === undefined) {
      this.highlights = [];
      return;
    }
    const projectIndex = this.projects.findIndex((item) => item.id === project.id);
    if (projectIndex >= 0) {
      this.projects = [
        ...this.projects.slice(0, projectIndex),
        project,
        ...this.projects.slice(projectIndex + 1),
      ];
    }
    const items = await listHighlights({ project_id: project.id });
    this.highlights = orderHighlightsForProject(items, project);
  }

  private showStatus(message: string): void {
    this.statusMessage = message;
    if (this.statusTimer !== undefined) {
      window.clearTimeout(this.statusTimer);
    }
    this.statusTimer = window.setTimeout(() => {
      this.statusMessage = '';
      this.statusTimer = undefined;
    }, 3000);
  }

  private async selectProject(projectId: string): Promise<void> {
    this.selectedProjectId = projectId;
    await setLastProjectId(projectId);
    await this.loadHighlightsForProject();
  }

  private onProjectChange(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    if (select.value === NEW_PROJECT_SENTINEL) {
      select.value = this.selectedProjectId;
      this.openCreateDialog();
      return;
    }
    void this.selectProject(select.value);
  }

  private openCreateDialog(): void {
    this.createError = '';
    this.newProjectName = '';
    this.createDialogOpen = true;
  }

  private closeCreateDialog(): void {
    this.createDialogOpen = false;
    this.newProjectName = '';
    this.createError = '';
  }

  private onNewProjectNameInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    this.newProjectName = input.value;
    this.createError = '';
  }

  private async handleCreateProject(): Promise<void> {
    const name = this.newProjectName.trim();
    if (name === '') {
      this.createError = '名前を入力してください';
      return;
    }
    try {
      await assertProjectLimit(await getCurrentTier());
      const project = await createProject(name);
      this.closeCreateDialog();
      const projects = await listProjects();
      this.projects = projects.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      await this.selectProject(project.id);
    } catch (error) {
      if (error instanceof ProjectLimitError) {
        this.createError = 'プロジェクト数の上限に達しています';
        return;
      }
      this.createError = '作成に失敗しました';
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('createDialogOpen') && this.createDialogOpen) {
      const input = this.renderRoot.querySelector('#new-project-name');
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    }
    if (changed.has('focusedHighlightId') && this.focusedHighlightId !== null) {
      const row = this.renderRoot.querySelector(
        `#highlight-row-${this.focusedHighlightId}`,
      );
      if (row instanceof HTMLElement) {
        row.focus();
      }
    }
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

  private async handleExcludeFromProject(highlight: Highlight): Promise<void> {
    if (this.selectedProjectId === '') {
      return;
    }
    await removeHighlightFromProject(this.selectedProjectId, highlight.id);
    await this.loadHighlightsForProject();
    this.showStatus('プロジェクトから除外しました（ハイライト自体は削除されません）');
  }

  private async handleJump(highlight: Highlight): Promise<void> {
    await jumpToHighlightFromSidePanel(highlight);
  }

  private async handleColorChange(highlight: Highlight, color: HighlightColor): Promise<void> {
    if (highlight.color === color) {
      return;
    }
    const updated = await updateHighlight(highlight.id, { color });
    this.highlights = this.highlights.map((item) =>
      item.id === updated.id ? updated : item,
    );
    await notifyHighlightColorOnOpenTabs(updated, color);
  }

  private moveHighlight(index: number, direction: -1 | 1): void {
    const insertIndex = direction < 0 ? index - 1 : index + 2;
    if (insertIndex < 0 || insertIndex > this.highlights.length) {
      return;
    }
    const next = reorderByIndex(this.highlights, index, insertIndex);
    const unchanged = next.every((item, i) => item.id === this.highlights[i]?.id);
    if (unchanged) {
      return;
    }
    const movedId = this.highlights[index]?.id;
    this.highlights = next;
    if (movedId !== undefined) {
      this.focusedHighlightId = movedId;
    }
    void this.persistHighlightOrder(next.map((highlight) => highlight.id));
  }

  private applyReorder(fromIndex: number, insertIndex: number): void {
    const next = reorderByIndex(this.highlights, fromIndex, insertIndex);
    const unchanged = next.every((item, i) => item.id === this.highlights[i]?.id);
    if (unchanged) {
      return;
    }
    this.highlights = next;
    void this.persistHighlightOrder(next.map((highlight) => highlight.id));
  }

  private clearDragState(): void {
    this.dragSourceId = null;
    this.dropInsertIndex = -1;
  }

  private onDragHandleStart(event: DragEvent, highlightId: string): void {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    event.dataTransfer?.setData('text/plain', highlightId);
    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = 'move';
    }
    this.dragSourceId = highlightId;
    this.dropInsertIndex = -1;
  }

  private onDragEnd(): void {
    this.clearDragState();
  }

  private onListDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'move';
    }
    const list = event.currentTarget;
    if (!(list instanceof HTMLElement)) {
      return;
    }
    const rows = list.querySelectorAll<HTMLElement>('.highlight-item');
    if (rows.length === 0) {
      this.dropInsertIndex = 0;
      return;
    }
    const last = rows[rows.length - 1];
    const rect = last.getBoundingClientRect();
    if (event.clientY > rect.bottom) {
      this.dropInsertIndex = this.highlights.length;
    }
  }

  private onItemDragOver(event: DragEvent, listIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'move';
    }
    const row = event.currentTarget;
    if (!(row instanceof HTMLElement)) {
      return;
    }
    const rect = row.getBoundingClientRect();
    this.dropInsertIndex = computeInsertIndex(event.clientY, rect.top, rect.height, listIndex);
  }

  private onListDragLeave(event: DragEvent): void {
    const related = event.relatedTarget;
    const list = event.currentTarget;
    if (list instanceof HTMLElement && related instanceof Node && list.contains(related)) {
      return;
    }
    this.dropInsertIndex = -1;
  }

  private onListDrop(event: DragEvent): void {
    event.preventDefault();
    const sourceId = event.dataTransfer?.getData('text/plain') ?? this.dragSourceId;
    if (sourceId === null || sourceId === '') {
      this.clearDragState();
      return;
    }
    const fromIndex = this.highlights.findIndex((highlight) => highlight.id === sourceId);
    const insertIndex =
      this.dropInsertIndex >= 0 ? this.dropInsertIndex : this.highlights.length;
    if (fromIndex >= 0) {
      this.applyReorder(fromIndex, insertIndex);
    }
    this.clearDragState();
  }

  private onHighlightKeydown(event: KeyboardEvent, highlightId: string, index: number): void {
    if (!(event.metaKey || event.ctrlKey)) {
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveHighlight(index, -1);
      this.focusedHighlightId = highlightId;
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveHighlight(index, 1);
      this.focusedHighlightId = highlightId;
    }
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
      return html`<p class="empty">プロジェクトがありません。上のセレクタから「+ 新規プロジェクト」を選んで作成してください。</p>`;
    }
    if (this.highlights.length === 0) {
      return html`<p class="empty">${EMPTY_PROJECT_HIGHLIGHTS_MESSAGE}</p>`;
    }

    return html`
      <ul
        class="highlight-list"
        @dragover=${this.onListDragOver}
        @dragleave=${this.onListDragLeave}
        @drop=${this.onListDrop}
      >
        ${this.highlights.map(
          (highlight, index) => html`
            ${this.dropInsertIndex === index
              ? html`<li class="drop-line" aria-hidden="true"></li>`
              : nothing}
            <li
              id="highlight-row-${highlight.id}"
              class="highlight-item ${this.dragSourceId === highlight.id
                ? 'highlight-item--ghost'
                : ''} ${this.focusedHighlightId === highlight.id
                ? 'highlight-item--focused'
                : ''}"
              tabindex="0"
              @dragover=${(event: DragEvent) => {
                this.onItemDragOver(event, index);
              }}
              @focus=${() => {
                this.focusedHighlightId = highlight.id;
              }}
              @blur=${() => {
                if (this.focusedHighlightId === highlight.id) {
                  this.focusedHighlightId = null;
                }
              }}
              @keydown=${(event: KeyboardEvent) => {
                this.onHighlightKeydown(event, highlight.id, index);
              }}
            >
              <button
                type="button"
                class="drag-handle"
                draggable="true"
                aria-label="並び替え"
                title="ドラッグで並び替え"
                @dragstart=${(event: DragEvent) => {
                  this.onDragHandleStart(event, highlight.id);
                }}
                @dragend=${() => {
                  this.onDragEnd();
                }}
                @click=${(event: Event) => {
                  event.stopPropagation();
                }}
              >
                ⠿
              </button>
              <div
                class="highlight-marker"
                style="background: ${COLOR_VAR[highlight.color]}"
                aria-hidden="true"
              ></div>
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
              <div class="highlight-body">
                <p class="highlight-text">${highlight.selected_text}</p>
                <p class="highlight-meta">${highlight.page_title} · ${highlight.domain}</p>
                <div class="highlight-actions">
                  <label class="color-label">
                    <span class="sr-only">色</span>
                    <select
                      class="color-select"
                      .value=${highlight.color}
                      @change=${(event: Event) => {
                        const select = event.target;
                        if (!(select instanceof HTMLSelectElement)) {
                          return;
                        }
                        void this.handleColorChange(highlight, select.value as HighlightColor);
                      }}
                    >
                      ${HIGHLIGHT_COLORS.map(
                        (color) => html`
                          <option value=${color}>${COLOR_LABELS[color]}</option>
                        `,
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    class="card-btn"
                    @click=${() => {
                      void this.handleJump(highlight);
                    }}
                  >
                    ジャンプ
                  </button>
                  <button
                    type="button"
                    class="card-btn card-btn--exclude"
                    @click=${() => {
                      void this.handleExcludeFromProject(highlight);
                    }}
                  >
                    除外
                  </button>
                </div>
              </div>
            </li>
          `,
        )}
        ${this.dropInsertIndex === this.highlights.length
          ? html`<li class="drop-line" aria-hidden="true"></li>`
          : nothing}
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
                @change=${(event: Event) => {
                  this.onProjectChange(event);
                }}
              >
                ${this.projects.length === 0
                  ? html`<option value="">プロジェクトなし</option>`
                  : nothing}
                ${this.projects.map(
                  (project) => html`
                    <option value=${project.id}>
                      ${project.cover_emoji} ${project.name}
                    </option>
                  `,
                )}
                <option value=${NEW_PROJECT_SENTINEL}>+ 新規プロジェクト</option>
              </select>
            </header>

            <section class="highlights" aria-label="ハイライト一覧">
              <h2 class="panel-title">ハイライト</h2>
              ${this.statusMessage
                ? html`<p class="status-toast" role="status">${this.statusMessage}</p>`
                : nothing}
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

      ${this.createDialogOpen
        ? html`
            <div
              class="dialog-backdrop"
              role="presentation"
              @click=${(event: Event) => {
                if (event.target === event.currentTarget) {
                  this.closeCreateDialog();
                }
              }}
            >
              <div
                class="dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-project-title"
                @keydown=${(event: KeyboardEvent) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    this.closeCreateDialog();
                  }
                }}
              >
                <h2 id="new-project-title" class="dialog-title">新規プロジェクト</h2>
                <input
                  id="new-project-name"
                  class="dialog-input"
                  type="text"
                  placeholder="プロジェクト名"
                  .value=${this.newProjectName}
                  @input=${(event: Event) => {
                    this.onNewProjectNameInput(event);
                  }}
                  @keydown=${(event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void this.handleCreateProject();
                    }
                  }}
                />
                ${this.createError !== ''
                  ? html`<p class="dialog-error">${this.createError}</p>`
                  : nothing}
                <div class="dialog-actions">
                  <button
                    type="button"
                    class="btn"
                    @click=${() => {
                      this.closeCreateDialog();
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    class="btn btn--primary"
                    @click=${() => {
                      void this.handleCreateProject();
                    }}
                  >
                    作成
                  </button>
                </div>
              </div>
            </div>
          `
        : nothing}
    `;
  }
}

document.body.appendChild(document.createElement('markwell-side-panel-root'));

declare global {
  interface HTMLElementTagNameMap {
    'markwell-side-panel-root': MarkwellSidePanelRoot;
  }
}
