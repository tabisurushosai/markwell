import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { getCurrentTier } from '../shared/storage/license.js';
import {
  assertProjectLimit,
  createProject,
  deleteProject,
  listProjects,
  ProjectLimitError,
  updateProject,
} from '../shared/storage/projects.js';
import type { Project } from '../shared/types/project.js';
import {
  FALLBACK_PROJECT_EMOJI,
  formatProjectCoverEmoji,
} from '../shared/utils/project-emoji.js';
import { toastFrom, type ToastKind } from '../shared/components/toast.js';
import { optionsAccessibilityStyles } from './styles.js';

const DEFAULT_COVER_EMOJI = FALLBACK_PROJECT_EMOJI;
const FREE_PROJECT_LIMIT = 2;

type ProjectRow = {
  project: Project;
  highlightCount: number;
};

type EditingField = 'name' | 'description' | 'cover_emoji';

@customElement('mw-project-manager')
export class MwProjectManager extends LitElement {
  @state() private loading = true;

  @state() private projectRows: ProjectRow[] = [];

  @state() private currentTier: 'free' | 'trial' | 'premium' = 'free';

  @state() private filterQuery = '';

  @state() private newProjectName = '';

  @state() private newProjectDescription = '';

  @state() private newProjectEmoji = DEFAULT_COVER_EMOJI;

  @state() private editingProjectId: string | null = null;

  @state() private editingField: EditingField | null = null;

  @state() private editingName = '';

  @state() private editingDescription = '';

  @state() private editingCoverEmoji = '';

  static styles = [...optionsAccessibilityStyles, css`
    :host {
      display: block;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .search {
      flex: 1 1 200px;
      min-width: 0;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #242424;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .create-form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: end;
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #242424;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field label {
      margin: 0;
      font-size: 12px;
      color: #aaa;
    }

    .field input[type='text'],
    .field textarea {
      min-width: 180px;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .field textarea {
      min-height: 56px;
      resize: vertical;
    }

    .field--emoji input[type='text'] {
      width: 56px;
      min-width: 56px;
      text-align: center;
      font-size: 20px;
    }

    .btn {
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .btn:hover:not(:disabled) {
      border-color: #666;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn--primary {
      border-color: #8a7428;
      color: #ffd34e;
    }

    .btn--danger {
      border-color: #8b3a3a;
      color: #f0a0a0;
    }

    .meta {
      margin: 0 0 12px;
      font-size: 12px;
      color: #888;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th,
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #333;
      text-align: left;
      vertical-align: top;
    }

    th {
      color: #aaa;
      font-weight: 600;
    }

    .emoji-display {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      font-size: 20px;
      line-height: 1;
    }

    .project-name-btn {
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }

    .project-name-btn:hover {
      color: #ffd34e;
      text-decoration: underline;
    }

    .description-text {
      margin: 0;
      max-width: 320px;
      white-space: pre-wrap;
      word-break: break-word;
      color: #ccc;
      line-height: 1.5;
    }

    .description-empty {
      color: #666;
      font-style: italic;
    }

    .edit-input,
    .edit-textarea,
    .edit-emoji {
      width: 100%;
      padding: 4px 8px;
      border: 1px solid #666;
      border-radius: 4px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 13px;
    }

    .edit-textarea {
      min-height: 72px;
      resize: vertical;
    }

    .edit-emoji {
      width: 56px;
      text-align: center;
      font-size: 20px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .inline-form {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .empty {
      margin: 0;
      padding: 12px;
      border: 1px dashed #444;
      border-radius: 8px;
      color: #888;
      font-size: 13px;
    }

    .status {
      margin: 12px 0 0;
      font-size: 13px;
      color: #ffd34e;
    }

    .status--error {
      color: #f0a0a0;
    }
  `];

  connectedCallback(): void {
    super.connectedCallback();
    void this.reload();
  }

  private async reload(): Promise<void> {
    this.loading = true;
    const [projects, tier] = await Promise.all([listProjects(), getCurrentTier()]);
    this.currentTier = tier;
    this.projectRows = projects.map((project) => ({
      project,
      highlightCount: project.highlight_order.length,
    }));
    this.loading = false;
  }

  private get filteredRows(): ProjectRow[] {
    const query = this.filterQuery.trim().toLowerCase();
    if (query === '') {
      return this.projectRows;
    }
    return this.projectRows.filter((row) => {
      const { name, description } = row.project;
      return (
        name.toLowerCase().includes(query) || description.toLowerCase().includes(query)
      );
    });
  }

  private get tierLimitLabel(): string {
    if (this.currentTier !== 'free') {
      return '';
    }
    return `${String(this.projectRows.length)}/${String(FREE_PROJECT_LIMIT)} プロジェクト（Free）`;
  }

  private showStatus(message: string, isError = false): void {
    const kind: ToastKind = isError ? 'error' : 'success';
    toastFrom(this, message, kind);
  }

  private cancelEdit(): void {
    this.editingProjectId = null;
    this.editingField = null;
    this.editingName = '';
    this.editingDescription = '';
    this.editingCoverEmoji = '';
  }

  private startEdit(project: Project, field: EditingField): void {
    this.editingProjectId = project.id;
    this.editingField = field;
    this.editingName = project.name;
    this.editingDescription = project.description;
    this.editingCoverEmoji = project.cover_emoji;
  }

  private onEditKeydown(event: KeyboardEvent, projectId: string): void {
    if (event.key === 'Enter' && this.editingField !== 'description') {
      event.preventDefault();
      void this.handleSaveEdit(projectId);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  private async handleCreate(): Promise<void> {
    const name = this.newProjectName.trim();
    if (name === '') {
      this.showStatus('プロジェクト名を入力してください', true);
      return;
    }

    try {
      await assertProjectLimit(this.currentTier);
      await createProject(name, this.newProjectDescription.trim(), this.newProjectEmoji.trim());
      this.newProjectName = '';
      this.newProjectDescription = '';
      this.newProjectEmoji = DEFAULT_COVER_EMOJI;
      await this.reload();
      this.showStatus('プロジェクトを作成しました');
    } catch (error) {
      if (error instanceof ProjectLimitError) {
        this.showStatus(
          `Free プランではプロジェクトは最大 ${String(error.limit)} 個までです（現在 ${String(error.current)} 個）`,
          true,
        );
        return;
      }
      this.showStatus(
        error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました',
        true,
      );
    }
  }

  private async handleSaveEdit(projectId: string): Promise<void> {
    const field = this.editingField;
    if (field === null) {
      return;
    }

    try {
      if (field === 'name') {
        const name = this.editingName.trim();
        if (name === '') {
          this.showStatus('プロジェクト名を入力してください', true);
          return;
        }
        await updateProject(projectId, { name });
      } else if (field === 'description') {
        await updateProject(projectId, { description: this.editingDescription.trim() });
      } else {
        const emoji = this.editingCoverEmoji.trim();
        if (emoji === '') {
          this.showStatus('絵文字を入力してください', true);
          return;
        }
        await updateProject(projectId, { cover_emoji: emoji });
      }

      this.cancelEdit();
      await this.reload();
      this.showStatus('プロジェクトを更新しました');
    } catch (error) {
      this.showStatus(
        error instanceof Error ? error.message : 'プロジェクトの更新に失敗しました',
        true,
      );
    }
  }

  private async handleDelete(row: ProjectRow): Promise<void> {
    const { project, highlightCount } = row;
    const highlightNote =
      highlightCount > 0
        ? `\n含まれる ${String(highlightCount)} 件のハイライトは削除されず、プロジェクト未所属になります。`
        : '';
    const confirmed = window.confirm(
      `プロジェクト「${project.name}」を削除しますか？${highlightNote}`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteProject(project.id);
      if (this.editingProjectId === project.id) {
        this.cancelEdit();
      }
      await this.reload();
      this.showStatus('プロジェクトを削除しました');
    } catch (error) {
      this.showStatus(
        error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました',
        true,
      );
    }
  }

  private renderEmojiCell(row: ProjectRow) {
    const { project } = row;
    if (this.editingProjectId === project.id && this.editingField === 'cover_emoji') {
      return html`
        <input
          class="edit-emoji"
          type="text"
          aria-label="カバー絵文字を編集"
          .value=${this.editingCoverEmoji}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
              this.editingCoverEmoji = input.value;
            }
          }}
          @keydown=${(event: KeyboardEvent) => { this.onEditKeydown(event, project.id); }}
        />
      `;
    }

    return html`
      <span
        class="emoji-display"
        title=${formatProjectCoverEmoji(project.cover_emoji)}
        aria-hidden="true"
      >
        ${formatProjectCoverEmoji(project.cover_emoji)}
      </span>
    `;
  }

  private renderNameCell(row: ProjectRow) {
    const { project } = row;
    if (this.editingProjectId === project.id && this.editingField === 'name') {
      return html`
        <input
          class="edit-input"
          type="text"
          aria-label="プロジェクト名を編集"
          .value=${this.editingName}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
              this.editingName = input.value;
            }
          }}
          @keydown=${(event: KeyboardEvent) => { this.onEditKeydown(event, project.id); }}
        />
      `;
    }

    return html`
      <button
        type="button"
        class="project-name-btn"
        aria-label=${`プロジェクト名を変更: ${project.name}`}
        title="クリックして名前を変更"
        @click=${() => { this.startEdit(project, 'name'); }}
      >
        ${project.name}
      </button>
    `;
  }

  private renderDescriptionCell(row: ProjectRow) {
    const { project } = row;
    if (this.editingProjectId === project.id && this.editingField === 'description') {
      return html`
        <textarea
          class="edit-textarea"
          aria-label="説明を編集"
          .value=${this.editingDescription}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLTextAreaElement) {
              this.editingDescription = input.value;
            }
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              this.cancelEdit();
            }
          }}
        ></textarea>
      `;
    }

    if (project.description.trim() === '') {
      return html`<p class="description-text description-empty">（説明なし）</p>`;
    }

    return html`<p class="description-text">${project.description}</p>`;
  }

  private renderActions(row: ProjectRow) {
    const { project } = row;

    if (this.editingProjectId === project.id && this.editingField !== null) {
      return html`
        <div class="inline-form">
          <button
            type="button"
            class="btn btn--primary"
            aria-label="保存"
            @click=${() => void this.handleSaveEdit(project.id)}
          >
            保存
          </button>
          <button type="button" class="btn" aria-label="キャンセル" @click=${() => { this.cancelEdit(); }}>
            キャンセル
          </button>
        </div>
      `;
    }

    return html`
      <div class="actions">
        <button type="button" class="btn" aria-label="名前変更" @click=${() => { this.startEdit(project, 'name'); }}>
          名前変更
        </button>
        <button
          type="button"
          class="btn"
          aria-label="説明編集"
          @click=${() => { this.startEdit(project, 'description'); }}
        >
          説明編集
        </button>
        <button
          type="button"
          class="btn"
          aria-label="絵文字変更"
          @click=${() => { this.startEdit(project, 'cover_emoji'); }}
        >
          絵文字変更
        </button>
        <button
          type="button"
          class="btn btn--danger"
          aria-label="削除"
          @click=${() => void this.handleDelete(row)}
        >
          削除
        </button>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`<p class="empty">プロジェクトを読み込み中…</p>`;
    }

    const rows = this.filteredRows;
    const tierLabel = this.tierLimitLabel;

    return html`
      ${tierLabel !== '' ? html`<p class="meta">${tierLabel}</p>` : nothing}
      <div class="create-form">
        <div class="field">
          <label for="new-project-name">新規プロジェクト</label>
          <input
            id="new-project-name"
            type="text"
            placeholder="名前"
            .value=${this.newProjectName}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLInputElement) {
                this.newProjectName = input.value;
              }
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void this.handleCreate();
              }
            }}
          />
        </div>
        <div class="field">
          <label for="new-project-description">説明</label>
          <textarea
            id="new-project-description"
            placeholder="任意"
            .value=${this.newProjectDescription}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLTextAreaElement) {
                this.newProjectDescription = input.value;
              }
            }}
          ></textarea>
        </div>
        <div class="field field--emoji">
          <label for="new-project-emoji">絵文字</label>
          <input
            id="new-project-emoji"
            type="text"
            .value=${this.newProjectEmoji}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLInputElement) {
                this.newProjectEmoji = input.value;
              }
            }}
          />
        </div>
        <button
          type="button"
          class="btn btn--primary"
          aria-label="作成"
          @click=${() => void this.handleCreate()}
        >
          作成
        </button>
      </div>

      <div class="toolbar">
        <input
          class="search"
          type="search"
          placeholder="名前・説明で検索…"
          .value=${this.filterQuery}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
              this.filterQuery = input.value;
            }
          }}
        />
      </div>

      ${rows.length === 0
        ? html`<p class="empty">${this.projectRows.length === 0 ? 'プロジェクトがありません' : '一致するプロジェクトがありません'}</p>`
        : html`
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">絵文字</th>
                    <th scope="col">名前</th>
                    <th scope="col">説明</th>
                    <th scope="col">ハイライト</th>
                    <th scope="col">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(
                    (row) => html`
                      <tr>
                        <td>${this.renderEmojiCell(row)}</td>
                        <td>${this.renderNameCell(row)}</td>
                        <td>${this.renderDescriptionCell(row)}</td>
                        <td>${String(row.highlightCount)}</td>
                        <td>${this.renderActions(row)}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-project-manager': MwProjectManager;
  }
}
