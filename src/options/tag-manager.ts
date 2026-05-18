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
  updateTagColor,
} from '../shared/storage/tags.js';
import {
  bulkDeleteTags,
  bulkUpdateTagColors,
} from './utils/bulk-tag-operations.js';
import { t } from '../shared/utils/i18n.js';
import { optionsAccessibilityStyles } from './styles.js';

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

  @state() private selectionMode = false;

  @state() private selectedTagIds: string[] = [];

  @state() private bulkWorking = false;

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

    .btn--active {
      border-color: #8a7428;
      color: #ffd34e;
    }

    .bulk-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
      padding: 12px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #242424;
    }

    .bulk-meta {
      font-size: 12px;
      color: #888;
    }

    .row-checkbox {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .select-col {
      width: 32px;
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
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid #555;
      vertical-align: middle;
    }

    .color-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-picker-hidden {
      position: absolute;
      width: 0;
      height: 0;
      padding: 0;
      border: 0;
      opacity: 0;
      pointer-events: none;
    }

    .tag-name-btn {
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
  `];

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

  private pruneSelection(): void {
    const visibleIds = new Set(this.filteredRows.map((row) => row.tag.id));
    this.selectedTagIds = this.selectedTagIds.filter((id) => visibleIds.has(id));
  }

  private get selectedCount(): number {
    return this.selectedTagIds.length;
  }

  private get allVisibleSelected(): boolean {
    const rows = this.filteredRows;
    return rows.length > 0 && rows.every((row) => this.isSelected(row.tag.id));
  }

  private isSelected(tagId: string): boolean {
    return this.selectedTagIds.includes(tagId);
  }

  private toggleSelectionMode(): void {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.clearSelection();
    }
    this.cancelEdit();
    this.cancelMerge();
  }

  private clearSelection(): void {
    this.selectedTagIds = [];
  }

  private toggleTagSelection(tagId: string): void {
    if (this.isSelected(tagId)) {
      this.selectedTagIds = this.selectedTagIds.filter((id) => id !== tagId);
      return;
    }
    this.selectedTagIds = [...this.selectedTagIds, tagId];
  }

  private toggleSelectAllVisible(): void {
    const rows = this.filteredRows;
    if (this.allVisibleSelected) {
      const visibleIds = new Set(rows.map((row) => row.tag.id));
      this.selectedTagIds = this.selectedTagIds.filter((id) => !visibleIds.has(id));
      return;
    }
    const merged = new Set(this.selectedTagIds);
    for (const row of rows) {
      merged.add(row.tag.id);
    }
    this.selectedTagIds = [...merged];
  }

  private getSelectedRows(): TagRow[] {
    return this.tagRows.filter((row) => this.isSelected(row.tag.id));
  }

  private async handleBulkDelete(): Promise<void> {
    if (this.selectedCount === 0 || this.bulkWorking) {
      return;
    }

    const selectedRows = this.getSelectedRows();
    const totalUsage = selectedRows.reduce((sum, row) => sum + row.usageCount, 0);
    const usageNote =
      totalUsage > 0
        ? `\n${String(totalUsage)} 件のハイライトからタグが外れます。`
        : '';
    const confirmed = window.confirm(
      `選択した ${String(selectedRows.length)} 件のタグを削除しますか？${usageNote}`,
    );
    if (!confirmed) {
      return;
    }

    this.bulkWorking = true;
    try {
      const count = await bulkDeleteTags(selectedRows.map((row) => row.tag.id));
      this.clearSelection();
      this.selectionMode = false;
      this.cancelEdit();
      this.cancelMerge();
      await this.reload();
      this.showStatus(`${String(count)} 件のタグを削除しました`);
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : '一括削除に失敗しました', true);
    } finally {
      this.bulkWorking = false;
    }
  }

  private openBulkColorPicker(): void {
    const input = this.renderRoot.querySelector('#bulk-tag-color');
    if (input instanceof HTMLInputElement) {
      input.click();
    }
  }

  private async handleBulkColorChange(event: Event): Promise<void> {
    if (this.selectedCount === 0 || this.bulkWorking) {
      return;
    }

    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const color = input.value;
    this.bulkWorking = true;
    try {
      const count = await bulkUpdateTagColors(this.selectedTagIds, color);
      this.clearSelection();
      this.selectionMode = false;
      await this.reload();
      this.showStatus(`${String(count)} 件のタグ色を変更しました`);
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : '一括色変更に失敗しました', true);
    } finally {
      this.bulkWorking = false;
    }
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
    if (this.selectionMode) {
      return;
    }
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
      t('confirm_merge_tag', [source.name, target.name]),
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

  private openColorPicker(tagId: string): void {
    const input = this.renderRoot.querySelector(`#tag-color-${tagId}`);
    if (input instanceof HTMLInputElement) {
      input.click();
    }
  }

  private async handleColorChange(tagId: string, event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const color = input.value;
    const current = this.tagRows.find((row) => row.tag.id === tagId)?.tag.color;
    if (current !== undefined && color.toLowerCase() === current.toLowerCase()) {
      return;
    }

    try {
      await updateTagColor(tagId, color);
      await this.reload();
      this.showStatus('タグの色を変更しました');
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : '色の変更に失敗しました', true);
    }
  }

  private renderColorCell(row: TagRow) {
    const { tag } = row;
    return html`
      <div class="color-cell">
        <span
          class="color-swatch"
          style="background: ${tag.color}"
          title=${tag.color}
          aria-label=${`色: ${tag.color}`}
        ></span>
        <button
          type="button"
          class="btn"
          aria-label="色変更"
          @click=${() => this.openColorPicker(tag.id)}
        >
          色変更
        </button>
        <input
          id=${`tag-color-${tag.id}`}
          class="color-picker-hidden"
          type="color"
          .value=${tag.color}
          aria-label=${`${tag.name} の色を変更`}
          @change=${(event: Event) => {
            void this.handleColorChange(tag.id, event);
          }}
        />
      </div>
    `;
  }

  private renderTagNameCell(row: TagRow) {
    const { tag } = row;
    if (this.editingTagId === tag.id) {
      return html`
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
      <button
        type="button"
        class="tag-name-btn"
        aria-label=${`タグ名を変更: ${tag.name}`}
        title="クリックして名前を変更"
        @click=${() => this.startRename(tag)}
      >
        ${tag.name}
      </button>
    `;
  }

  private renderBulkBar() {
    if (!this.selectionMode || this.selectedCount === 0) {
      return nothing;
    }

    return html`
      <div class="bulk-bar">
        <span class="bulk-meta">${String(this.selectedCount)} 件選択中</span>
        <button
          type="button"
          class="btn"
          aria-label="一括色変更"
          ?disabled=${this.bulkWorking}
          @click=${() => {
            this.openBulkColorPicker();
          }}
        >
          一括色変更
        </button>
        <input
          id="bulk-tag-color"
          class="color-picker-hidden"
          type="color"
          aria-label="選択したタグの色を一括変更"
          .value=${DEFAULT_TAG_COLOR}
          @change=${(event: Event) => {
            void this.handleBulkColorChange(event);
          }}
        />
        <button
          type="button"
          class="btn btn--danger"
          aria-label="一括削除"
          ?disabled=${this.bulkWorking}
          @click=${() => {
            void this.handleBulkDelete();
          }}
        >
          一括削除
        </button>
      </div>
    `;
  }

  private renderActions(row: TagRow) {
    const { tag, usageCount } = row;

    if (this.editingTagId === tag.id) {
      return html`
        <div class="inline-form">
          <button
            type="button"
            class="btn btn--primary"
            aria-label="保存"
            @click=${() => void this.handleRename(tag.id)}
          >
            保存
          </button>
          <button type="button" class="btn" aria-label="キャンセル" @click=${() => this.cancelEdit()}>
            キャンセル
          </button>
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
            aria-label="統合する"
            ?disabled=${this.mergeTargetId === ''}
            @click=${() => void this.handleMerge(tag.id)}
          >
            統合する
          </button>
          <button type="button" class="btn" aria-label="キャンセル" @click=${() => this.cancelMerge()}>
            キャンセル
          </button>
        </div>
      `;
    }

    return html`
      <div class="actions">
        <button type="button" class="btn" aria-label="名前変更" @click=${() => this.startRename(tag)}>
          名前変更
        </button>
        <button
          type="button"
          class="btn"
          aria-label="他のタグに統合"
          ?disabled=${this.tagRows.length < 2}
          @click=${() => this.startMerge(tag.id)}
        >
          他のタグに統合
        </button>
        <button
          type="button"
          class="btn btn--danger"
          aria-label="削除"
          @click=${() => void this.handleDelete(tag, usageCount)}
        >
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
          placeholder="タグ名で検索…"
          .value=${this.filterQuery}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
              this.filterQuery = input.value;
              this.pruneSelection();
            }
          }}
        />
        ${this.tagRows.length > 0
          ? html`
              <button
                type="button"
                class="btn ${this.selectionMode ? 'btn--active' : ''}"
                aria-label=${this.selectionMode ? '選択を終了' : '複数選択'}
                @click=${() => {
                  this.toggleSelectionMode();
                }}
              >
                ${this.selectionMode ? '選択を終了' : '複数選択'}
              </button>
              ${this.selectionMode
                ? html`
                    <button
                      type="button"
                      class="btn"
                      aria-label=${this.allVisibleSelected
                        ? '表示分の選択を解除'
                        : '表示分をすべて選択'}
                      ?disabled=${rows.length === 0}
                      @click=${() => {
                        this.toggleSelectAllVisible();
                      }}
                    >
                      ${this.allVisibleSelected ? '表示分の選択を解除' : '表示分をすべて選択'}
                    </button>
                  `
                : nothing}
            `
          : nothing}
      </div>

      ${this.renderBulkBar()}

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
                    ${this.selectionMode
                      ? html`<th scope="col" class="select-col"><span class="sr-only">選択</span></th>`
                      : nothing}
                    <th scope="col">タグ</th>
                    <th scope="col">色</th>
                    <th scope="col">使用回数</th>
                    <th scope="col">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(
                    (row) => html`
                      <tr>
                        ${this.selectionMode
                          ? html`
                              <td class="select-col">
                                <input
                                  class="row-checkbox"
                                  type="checkbox"
                                  .checked=${this.isSelected(row.tag.id)}
                                  aria-label=${`${row.tag.name} を選択`}
                                  @change=${() => {
                                    this.toggleTagSelection(row.tag.id);
                                  }}
                                />
                              </td>
                            `
                          : nothing}
                        <td>${this.renderTagNameCell(row)}</td>
                        <td>${this.selectionMode ? nothing : this.renderColorCell(row)}</td>
                        <td>${String(row.usageCount)}</td>
                        <td>${this.selectionMode ? nothing : this.renderActions(row)}</td>
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
