import { LitElement, css, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import type { Tag } from '../shared/types/tag.js';
import {
  createTag,
  deleteTag,
  getTagUsageCounts,
  listTags,
  mergeTag,
  renameTag,
} from '../shared/storage/tags.js';

const DEFAULT_TAG_COLOR = '#ffd34e';

type TagRow = {
  tag: Tag;
  usageCount: number;
};

@customElement('mw-tag-manager')
export class MwTagManager extends LitElement {
  @state() private loading = true;

  @state() private tagRows: TagRow[] = [];

  @state() private filterQuery = '';

  @state() private newTagName = '';

  @state() private newTagColor = DEFAULT_TAG_COLOR;

  @state() private statusMessage = '';

  @state() private editingTagId: string | null = null;

  @state() private editingName = '';

  @state() private mergingTagId: string | null = null;

  @state() private mergeTargetId = '';

  static styles = css`
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

    .field input[type='text'] {
      min-width: 180px;
      padding: 8px 12px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 14px;
    }

    .field input[type='color'] {
      width: 44px;
      height: 36px;
      padding: 2px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #1a1a1a;
      cursor: pointer;
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
      vertical-align: middle;
    }

    th {
      color: #aaa;
      font-weight: 600;
    }

    .color-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid #555;
      vertical-align: middle;
    }

    .tag-name-btn {
      margin-left: 8px;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }

    .tag-name-btn:hover {
      color: #ffd34e;
      text-decoration: underline;
    }

    .rename-input {
      margin-left: 8px;
      min-width: 140px;
      padding: 4px 8px;
      border: 1px solid #666;
      border-radius: 4px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 13px;
    }

    .merge-select {
      min-width: 180px;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
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

    .inline-form input,
    .inline-form select {
      padding: 6px 8px;
      border: 1px solid #444;
      border-radius: 6px;
      background: #1a1a1a;
      color: #e0e0e0;
      font-family: inherit;
      font-size: 13px;
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
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.reload();
  }

  private async reload(): Promise<void> {
    this.loading = true;
    const [tags, usageCounts] = await Promise.all([listTags(), getTagUsageCounts()]);
    this.tagRows = tags.map((tag) => ({
      tag,
      usageCount: usageCounts[tag.id] ?? 0,
    }));
    this.loading = false;
  }

  private get filteredRows(): TagRow[] {
    const query = this.filterQuery.trim().toLowerCase();
    if (query === '') {
      return this.tagRows;
    }
    return this.tagRows.filter((row) => row.tag.name.toLowerCase().includes(query));
  }

  private showStatus(message: string, isError = false): void {
    this.statusMessage = isError ? `error:${message}` : message;
    window.setTimeout(() => {
      if (this.statusMessage === message || this.statusMessage === `error:${message}`) {
        this.statusMessage = '';
      }
    }, 2500);
  }

  private cancelEdit(): void {
    this.editingTagId = null;
    this.editingName = '';
  }

  private cancelMerge(): void {
    this.mergingTagId = null;
    this.mergeTargetId = '';
  }

  private async handleCreate(): Promise<void> {
    const name = this.newTagName.trim();
    if (name === '') {
      this.showStatus('タグ名を入力してください', true);
      return;
    }

    try {
      const existing = this.tagRows.find((row) => row.tag.name === name);
      if (existing !== undefined) {
        this.showStatus('同名のタグが既に存在します', true);
        return;
      }

      await createTag(name, this.newTagColor);
      this.newTagName = '';
      await this.reload();
      this.showStatus('タグを作成しました');
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'タグの作成に失敗しました', true);
    }
  }

  private startRename(tag: Tag): void {
    this.cancelMerge();
    this.editingTagId = tag.id;
    this.editingName = tag.name;
  }

  private async handleRename(tagId: string): Promise<void> {
    const newName = this.editingName.trim();
    const current = this.tagRows.find((row) => row.tag.id === tagId)?.tag.name ?? '';
    if (newName === '') {
      this.showStatus('タグ名を入力してください', true);
      return;
    }
    if (newName === current) {
      this.cancelEdit();
      return;
    }

    try {
      await renameTag(tagId, newName);
      this.cancelEdit();
      await this.reload();
      this.showStatus('タグ名を変更しました');
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : '名前の変更に失敗しました', true);
    }
  }

  private onRenameKeydown(event: KeyboardEvent, tagId: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.handleRename(tagId);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  private startMerge(tagId: string): void {
    this.cancelEdit();
    this.mergingTagId = tagId;
    this.mergeTargetId = '';
  }

  private async handleMerge(sourceId: string): Promise<void> {
    if (this.mergeTargetId === '') {
      this.showStatus('統合先のタグを選択してください', true);
      return;
    }

    const source = this.tagRows.find((row) => row.tag.id === sourceId)?.tag;
    const target = this.tagRows.find((row) => row.tag.id === this.mergeTargetId)?.tag;
    if (source === undefined || target === undefined) {
      return;
    }

    const confirmed = window.confirm(
      `「${source.name}」を「${target.name}」に統合しますか？\n元のタグは削除され、ハイライトは統合先タグに付け替えられます。`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await mergeTag(sourceId, this.mergeTargetId);
      this.cancelMerge();
      await this.reload();
      this.showStatus('タグを統合しました');
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'タグの統合に失敗しました', true);
    }
  }

  private async handleDelete(tag: Tag, usageCount: number): Promise<void> {
    const confirmed = window.confirm(
      usageCount > 0
        ? `「${tag.name}」を削除しますか？\n${String(usageCount)} 件のハイライトからこのタグが外れます。`
        : `「${tag.name}」を削除しますか？`,
    );
    if (!confirmed) {
      return;
    }

    try {
      await deleteTag(tag.id);
      if (this.editingTagId === tag.id) {
        this.cancelEdit();
      }
      if (this.mergingTagId === tag.id) {
        this.cancelMerge();
      }
      await this.reload();
      this.showStatus('タグを削除しました');
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : 'タグの削除に失敗しました', true);
    }
  }

  private renderTagNameCell(row: TagRow) {
    const { tag } = row;
    if (this.editingTagId === tag.id) {
      return html`
        <span class="color-swatch" style="background: ${tag.color}" aria-hidden="true"></span>
        <input
          class="rename-input"
          type="text"
          aria-label="タグ名を編集"
          .value=${this.editingName}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
              this.editingName = input.value;
            }
          }}
          @keydown=${(event: KeyboardEvent) => this.onRenameKeydown(event, tag.id)}
        />
      `;
    }

    return html`
      <span class="color-swatch" style="background: ${tag.color}" aria-hidden="true"></span>
      <button
        type="button"
        class="tag-name-btn"
        title="クリックして名前を変更"
        @click=${() => this.startRename(tag)}
      >
        ${tag.name}
      </button>
    `;
  }

  private renderActions(row: TagRow) {
    const { tag, usageCount } = row;

    if (this.editingTagId === tag.id) {
      return html`
        <div class="inline-form">
          <button type="button" class="btn btn--primary" @click=${() => void this.handleRename(tag.id)}>
            保存
          </button>
          <button type="button" class="btn" @click=${() => this.cancelEdit()}>キャンセル</button>
        </div>
      `;
    }

    if (this.mergingTagId === tag.id) {
      const targets = this.tagRows.filter((entry) => entry.tag.id !== tag.id);
      return html`
        <div class="inline-form">
          <label class="sr-only" for=${`merge-target-${tag.id}`}>他のタグに統合</label>
          <select
            id=${`merge-target-${tag.id}`}
            class="merge-select"
            aria-label="他のタグに統合"
            .value=${this.mergeTargetId}
            @change=${(event: Event) => {
              const select = event.target;
              if (select instanceof HTMLSelectElement) {
                this.mergeTargetId = select.value;
              }
            }}
          >
            <option value="">他のタグに統合</option>
            ${targets.map(
              (entry) => html`
                <option value=${entry.tag.id}>${entry.tag.name}</option>
              `,
            )}
          </select>
          <button
            type="button"
            class="btn btn--primary"
            ?disabled=${this.mergeTargetId === ''}
            @click=${() => void this.handleMerge(tag.id)}
          >
            統合する
          </button>
          <button type="button" class="btn" @click=${() => this.cancelMerge()}>キャンセル</button>
        </div>
      `;
    }

    return html`
      <div class="actions">
        <button type="button" class="btn" @click=${() => this.startRename(tag)}>名前変更</button>
        <button
          type="button"
          class="btn"
          ?disabled=${this.tagRows.length < 2}
          @click=${() => this.startMerge(tag.id)}
        >
          他のタグに統合
        </button>
        <button type="button" class="btn btn--danger" @click=${() => void this.handleDelete(tag, usageCount)}>
          削除
        </button>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`<p class="empty">タグを読み込み中…</p>`;
    }

    const rows = this.filteredRows;
    const isError = this.statusMessage.startsWith('error:');
    const statusText = isError ? this.statusMessage.slice('error:'.length) : this.statusMessage;

    return html`
      <div class="create-form">
        <div class="field">
          <label for="new-tag-name">新規タグ</label>
          <input
            id="new-tag-name"
            type="text"
            placeholder="タグ名"
            .value=${this.newTagName}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLInputElement) {
                this.newTagName = input.value;
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
          <label for="new-tag-color">色</label>
          <input
            id="new-tag-color"
            type="color"
            .value=${this.newTagColor}
            @input=${(event: Event) => {
              const input = event.target;
              if (input instanceof HTMLInputElement) {
                this.newTagColor = input.value;
              }
            }}
          />
        </div>
        <button type="button" class="btn btn--primary" @click=${() => void this.handleCreate()}>作成</button>
      </div>

      <div class="toolbar">
        <input
          class="search"
          type="search"
          placeholder="タグ名で検索…"
          .value=${this.filterQuery}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
              this.filterQuery = input.value;
            }
          }}
        />
      </div>

      <p class="meta">
        ${this.filterQuery.trim() === ''
          ? `全 ${String(this.tagRows.length)} 件`
          : `表示 ${String(rows.length)} / 全 ${String(this.tagRows.length)} 件`}
      </p>

      ${rows.length === 0
        ? html`<p class="empty">${this.tagRows.length === 0 ? 'タグがありません' : '一致するタグがありません'}</p>`
        : html`
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">タグ</th>
                    <th scope="col">使用回数</th>
                    <th scope="col">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(
                    (row) => html`
                      <tr>
                        <td>${this.renderTagNameCell(row)}</td>
                        <td>${String(row.usageCount)}</td>
                        <td>${this.renderActions(row)}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            </div>
          `}
      ${statusText !== ''
        ? html`<p class="status ${isError ? 'status--error' : ''}">${statusText}</p>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-tag-manager': MwTagManager;
  }
}
