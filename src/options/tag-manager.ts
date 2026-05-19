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
import { toastFrom, type ToastKind } from '../shared/components/toast.js';
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
        ? t('options_tag_bulk_delete_usage_note', [String(totalUsage)])
        : '';
    const confirmed = window.confirm(
      t('options_tag_confirm_bulk_delete', [String(selectedRows.length), usageNote]),
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
      this.showStatus(t('options_tag_bulk_deleted', [String(count)]));
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : t('options_tag_bulk_delete_failed'), true);
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
      this.showStatus(t('options_tag_bulk_color_changed', [String(count)]));
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : t('options_tag_bulk_color_failed'), true);
    } finally {
      this.bulkWorking = false;
    }
  }

  private showStatus(message: string, isError = false): void {
    const kind: ToastKind = isError ? 'error' : 'success';
    toastFrom(this, message, kind);
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
      this.showStatus(t('options_tag_name_required'), true);
      return;
    }

    try {
      const existing = this.tagRows.find((row) => row.tag.name === name);
      if (existing !== undefined) {
        this.showStatus(t('options_tag_duplicate'), true);
        return;
      }

      await createTag(name, this.newTagColor);
      this.newTagName = '';
      await this.reload();
      this.showStatus(t('options_tag_created'));
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : t('options_tag_create_failed'), true);
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
      this.showStatus(t('options_tag_name_required'), true);
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
      this.showStatus(t('options_tag_renamed'));
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : t('options_tag_rename_failed'), true);
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
      this.showStatus(t('options_tag_merge_target_required'), true);
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
      this.showStatus(t('options_tag_merged'));
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : t('options_tag_merge_failed'), true);
    }
  }

  private async handleDelete(tag: Tag, usageCount: number): Promise<void> {
    const confirmed = window.confirm(
      usageCount > 0
        ? t('options_tag_confirm_delete_with_usage', [tag.name, String(usageCount)])
        : t('options_tag_confirm_delete', [tag.name]),
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
      this.showStatus(t('options_tag_deleted'));
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : t('options_tag_delete_failed'), true);
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
      this.showStatus(t('options_tag_color_changed'));
    } catch (error) {
      this.showStatus(error instanceof Error ? error.message : t('options_tag_color_change_failed'), true);
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
          aria-label=${t('options_tag_color_aria', [tag.color])}
        ></span>
        <button
          type="button"
          class="btn"
          aria-label=${t('options_action_change_color')}
          @click=${() => { this.openColorPicker(tag.id); }}
        >
          ${t('options_action_change_color')}
        </button>
        <input
          id=${`tag-color-${tag.id}`}
          class="color-picker-hidden"
          type="color"
          .value=${tag.color}
          aria-label=${t('options_tag_change_color_aria', [tag.name])}
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
          aria-label=${t('options_tag_edit_name')}
          .value=${this.editingName}
          @input=${(event: Event) => {
            const input = event.target;
            if (input instanceof HTMLInputElement) {
              this.editingName = input.value;
            }
          }}
          @keydown=${(event: KeyboardEvent) => { this.onRenameKeydown(event, tag.id); }}
        />
      `;
    }

    return html`
      <button
        type="button"
        class="tag-name-btn"
        aria-label=${t('options_tag_rename_aria', [tag.name])}
        title=${t('options_action_click_to_rename')}
        @click=${() => { this.startRename(tag); }}
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
        <span class="bulk-meta">${t('options_tag_selected_count', [String(this.selectedCount)])}</span>
        <button
          type="button"
          class="btn"
          aria-label=${t('options_action_bulk_change_color')}
          ?disabled=${this.bulkWorking}
          @click=${() => {
            this.openBulkColorPicker();
          }}
        >
          ${t('options_action_bulk_change_color')}
        </button>
        <input
          id="bulk-tag-color"
          class="color-picker-hidden"
          type="color"
          aria-label=${t('options_tag_bulk_color_aria')}
          .value=${DEFAULT_TAG_COLOR}
          @change=${(event: Event) => {
            void this.handleBulkColorChange(event);
          }}
        />
        <button
          type="button"
          class="btn btn--danger"
          aria-label=${t('options_action_bulk_delete')}
          ?disabled=${this.bulkWorking}
          @click=${() => {
            void this.handleBulkDelete();
          }}
        >
          ${t('options_action_bulk_delete')}
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
            aria-label=${t('note_dialog_save')}
            @click=${() => void this.handleRename(tag.id)}
          >
            ${t('note_dialog_save')}
          </button>
          <button type="button" class="btn" aria-label=${t('note_dialog_cancel')} @click=${() => { this.cancelEdit(); }}>
            ${t('note_dialog_cancel')}
          </button>
        </div>
      `;
    }

    if (this.mergingTagId === tag.id) {
      const targets = this.tagRows.filter((entry) => entry.tag.id !== tag.id);
      return html`
        <div class="inline-form">
          <label class="sr-only" for=${`merge-target-${tag.id}`}>${t('options_tag_merge_into')}</label>
          <select
            id=${`merge-target-${tag.id}`}
            class="merge-select"
            aria-label=${t('options_tag_merge_into')}
            .value=${this.mergeTargetId}
            @change=${(event: Event) => {
              const select = event.target;
              if (select instanceof HTMLSelectElement) {
                this.mergeTargetId = select.value;
              }
            }}
          >
            <option value="">${t('options_tag_merge_into')}</option>
            ${targets.map(
              (entry) => html`
                <option value=${entry.tag.id}>${entry.tag.name}</option>
              `,
            )}
          </select>
          <button
            type="button"
            class="btn btn--primary"
            aria-label=${t('options_action_merge')}
            ?disabled=${this.mergeTargetId === ''}
            @click=${() => void this.handleMerge(tag.id)}
          >
            ${t('options_action_merge')}
          </button>
          <button type="button" class="btn" aria-label=${t('note_dialog_cancel')} @click=${() => { this.cancelMerge(); }}>
            ${t('note_dialog_cancel')}
          </button>
        </div>
      `;
    }

    return html`
      <div class="actions">
        <button type="button" class="btn" aria-label=${t('options_action_rename')} @click=${() => { this.startRename(tag); }}>
          ${t('options_action_rename')}
        </button>
        <button
          type="button"
          class="btn"
          aria-label=${t('options_tag_merge_into')}
          ?disabled=${this.tagRows.length < 2}
          @click=${() => { this.startMerge(tag.id); }}
        >
          ${t('options_tag_merge_into')}
        </button>
        <button
          type="button"
          class="btn btn--danger"
          aria-label=${t('card_action_delete')}
          @click=${() => void this.handleDelete(tag, usageCount)}
        >
          ${t('card_action_delete')}
        </button>
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`<p class="empty">${t('options_tag_loading')}</p>`;
    }

    const rows = this.filteredRows;

    return html`
      <div class="create-form">
        <div class="field">
          <label for="new-tag-name">${t('options_tag_new')}</label>
          <input
            id="new-tag-name"
            type="text"
            placeholder=${t('options_tag_name_placeholder')}
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
          <label for="new-tag-color">${t('options_common_color')}</label>
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
          aria-label=${t('side_panel_create')}
          @click=${() => void this.handleCreate()}
        >
          ${t('side_panel_create')}
        </button>
      </div>

      <div class="toolbar">
        <input
          class="search"
          type="search"
          placeholder=${t('options_tag_search_placeholder')}
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
                aria-label=${this.selectionMode ? t('popup_selection_exit') : t('popup_selection_multi')}
                @click=${() => {
                  this.toggleSelectionMode();
                }}
              >
                ${this.selectionMode ? t('popup_selection_exit') : t('popup_selection_multi')}
              </button>
              ${this.selectionMode
                ? html`
                    <button
                      type="button"
                      class="btn"
                      aria-label=${this.allVisibleSelected
                        ? t('popup_deselect_all_visible')
                        : t('popup_select_all_visible')}
                      ?disabled=${rows.length === 0}
                      @click=${() => {
                        this.toggleSelectAllVisible();
                      }}
                    >
                      ${this.allVisibleSelected ? t('popup_deselect_all_visible') : t('popup_select_all_visible')}
                    </button>
                  `
                : nothing}
            `
          : nothing}
      </div>

      ${this.renderBulkBar()}

      <p class="meta">
        ${this.filterQuery.trim() === ''
          ? t('options_tag_count_all', [String(this.tagRows.length)])
          : t('options_tag_count_filtered', [String(rows.length), String(this.tagRows.length)])}
      </p>

      ${rows.length === 0
        ? html`<p class="empty">${this.tagRows.length === 0 ? t('options_tag_empty') : t('options_tag_no_match')}</p>`
        : html`
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    ${this.selectionMode
                      ? html`<th scope="col" class="select-col"><span class="sr-only">${t('options_action_select')}</span></th>`
                      : nothing}
                    <th scope="col">${t('options_common_tag')}</th>
                    <th scope="col">${t('options_common_color')}</th>
                    <th scope="col">${t('options_common_usage_count')}</th>
                    <th scope="col">${t('options_common_action')}</th>
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
                                  aria-label=${t('options_tag_select_row', [row.tag.name])}
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mw-tag-manager': MwTagManager;
  }
}
