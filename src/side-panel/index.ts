import { LitElement, html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import { streamProjectQaReply } from '../shared/ai/project-qa.js';
import { streamQuoteExtraction } from '../shared/ai/quote-extractor.js';
import { streamProjectSynthesis } from '../shared/ai/synthesis-run.js';
import {
  formatAiButtonLabel,
  formatAiButtonTitle,
  type AiFeature,
} from '../shared/license/ai-access.js';
import {
  formatTrialRemainingLabel,
  getTrialDaysRemaining,
  isTrialUrgent,
} from '../shared/license/trial-countdown.js';
import '../shared/ui/tier-badge.js';
import '../shared/ui/premium-dialog.js';
import type { PremiumDialogMode } from '../shared/ui/premium-dialog.js';
import { getCurrentTier, getLicenseStatus } from '../shared/storage/license.js';
import {
  buildGeminiTurnsFromSession,
  buildProjectQaSystemInstruction,
  canUseProjectQa,
  type QaChatMessage,
} from '../shared/ai/project-qa.js';
import {
  buildQuoteDownloadFilename,
  buildQuoteExtractorPrompt,
  canUseQuoteExtractor,
} from '../shared/ai/quote-extractor.js';
import {
  buildSynthesisPrompt,
  estimateTokens,
  extractUserInstructionFromPrompt,
  getSynthesisTokenWarning,
} from '../shared/ai/synthesis-prompt.js';
import { listHighlights, updateHighlight, type LicenseTier } from '../shared/storage/highlights.js';
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
import {
  createSynthesis,
  deleteSynthesis,
  listSyntheses,
} from '../shared/storage/syntheses.js';
import type { Highlight } from '../shared/types/highlight.js';
import type { HighlightColor } from '../shared/types/highlight.js';
import type { Project } from '../shared/types/project.js';
import { formatProjectCoverEmoji } from '../shared/utils/project-emoji.js';
import type { Synthesis } from '../shared/types/synthesis.js';
import { applyDocumentTheme, resolveEffectiveTheme } from '../popup/utils/theme.js';
import {
  jumpToHighlightFromSidePanel,
  notifyHighlightColorOnOpenTabs,
} from './utils/highlight-actions.js';
import { computeInsertIndex, reorderByIndex } from './utils/drag-reorder.js';
import { orderHighlightsForProject } from './utils/project-highlights.js';
import {
  copySynthesisMarkdown,
  downloadTextFile,
  exportSynthesis,
  isPremiumSynthesisExportFormat,
  SynthesisExportTierError,
  type SynthesisExportFormat,
  type SynthesisExportMeta,
} from './utils/synthesis-export.js';
import {
  formatSynthesisError,
  isSynthesisAbortError,
} from './utils/synthesis-errors.js';
import './components/markdown-it.js';
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

  @state() private synthesisMarkdown = '';

  @state() private resultVisible = false;

  @state() private synthesizing = false;

  @state() private premiumDialogOpen = false;

  @state() private premiumDialogMode: PremiumDialogMode = 'unlock';

  @state() private premiumHighlightFeature: AiFeature | null = null;

  @state() private trialRemainingLabel = '';

  @state() private trialUrgent = false;

  @state() private resultPanelMode: 'synthesis' | 'quotes' = 'synthesis';

  @state() private quotesMarkdown = '';

  @state() private extractingQuotes = false;

  @state() private quotesExportCreatedAt = Date.now();

  @state() private activeBottomTab: 'synthesis' | 'qa' = 'synthesis';

  @state() private qaMessages: QaChatMessage[] = [];

  @state() private qaInput = '';

  @state() private qaStreaming = false;

  @state() private currentTier: LicenseTier = 'free';

  @state() private exportMenuOpen = false;

  @state() private historyExportMenuId: string | null = null;

  @state() private synthesisExportCreatedAt = Date.now();

  @state() private lastSynthesisModel = 'gemini-2.0-flash';

  @state() private historyModalOpen = false;

  @state() private synthesisHistory: Synthesis[] = [];

  @state() private createDialogOpen = false;

  @state() private newProjectName = '';

  @state() private createError = '';

  @state() private statusMessage = '';

  @state() private dragSourceId: string | null = null;

  @state() private dropInsertIndex = -1;

  @state() private focusedHighlightId: string | null = null;

  private systemThemeQuery: MediaQueryList | null = null;

  private statusTimer: number | undefined;

  private synthesisAbortController: AbortController | null = null;

  private qaAbortController: AbortController | null = null;

  private quoteAbortController: AbortController | null = null;

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
    this.synthesisAbortController?.abort();
    this.synthesisAbortController = null;
    this.qaAbortController?.abort();
    this.qaAbortController = null;
    this.quoteAbortController?.abort();
    this.quoteAbortController = null;
  }

  private readonly onSystemThemeChange = (): void => {
    void this.applyThemeFromSettings();
  };

  private async bootstrap(): Promise<void> {
    await this.applyThemeFromSettings();
    await this.refreshLicenseTier();
    await this.loadProjects();
  }

  private async refreshLicenseTier(): Promise<void> {
    const [tier, license] = await Promise.all([getCurrentTier(), getLicenseStatus()]);
    this.currentTier = tier;
    if (tier === 'trial' && license.trial_end !== null) {
      const days = getTrialDaysRemaining(license.trial_end);
      this.trialRemainingLabel = formatTrialRemainingLabel(days);
      this.trialUrgent = isTrialUrgent(days);
    } else {
      this.trialRemainingLabel = '';
      this.trialUrgent = false;
    }
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

  private resetQaSession(): void {
    this.qaAbortController?.abort();
    this.qaAbortController = null;
    this.qaMessages = [];
    this.qaInput = '';
    this.qaStreaming = false;
  }

  private async selectProject(projectId: string): Promise<void> {
    this.resetQaSession();
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

  private async handleSynthesize(): Promise<void> {
    await this.runSynthesis({ savedStatusMessage: '合成結果を保存しました' });
  }

  private async handleRegenerate(): Promise<void> {
    await this.runSynthesis({ savedStatusMessage: '再生成しました' });
  }

  private async runSynthesis(opts: { savedStatusMessage: string }): Promise<void> {
    const tier = await getCurrentTier();
    if (tier === 'free') {
      this.openPremiumUnlockModal('synthesis');
      return;
    }

    if (this.highlights.length === 0) {
      this.showStatus('ハイライトがありません');
      return;
    }

    this.synthesisAbortController?.abort();
    const abortController = new AbortController();
    this.synthesisAbortController = abortController;

    const prompt = buildSynthesisPrompt(this.highlights, this.synthesisPrompt);
    const tokenWarning = getSynthesisTokenWarning(prompt);
    if (tokenWarning !== null) {
      this.showStatus(tokenWarning);
    }

    this.synthesizing = true;
    this.resultPanelMode = 'synthesis';
    this.resultVisible = true;
    this.synthesisMarkdown = '';

    let synthesisSucceeded = false;

    try {
      for await (const chunk of streamProjectSynthesis(prompt, {
        signal: abortController.signal,
      })) {
        this.synthesisMarkdown += chunk;
      }
      synthesisSucceeded = true;
    } catch (error) {
      if (isSynthesisAbortError(error)) {
        if (this.synthesisMarkdown === '') {
          this.resultVisible = false;
        }
        return;
      }
      this.synthesisMarkdown = formatSynthesisError(error);
    } finally {
      this.synthesizing = false;
      if (this.synthesisAbortController === abortController) {
        this.synthesisAbortController = null;
      }
    }

    if (
      synthesisSucceeded &&
      this.synthesisMarkdown.trim() !== '' &&
      !this.isSynthesisErrorMarkdown(this.synthesisMarkdown) &&
      this.selectedProjectId !== ''
    ) {
      await this.persistSynthesisRecord(prompt, this.synthesisMarkdown, opts.savedStatusMessage);
    }
  }

  private isSynthesisErrorMarkdown(markdown: string): boolean {
    return markdown.startsWith('**エラー:**');
  }

  private async persistSynthesisRecord(
    prompt: string,
    resultMarkdown: string,
    statusMessage = '合成結果を保存しました',
  ): Promise<void> {
    const settings = await getSettings();
    await createSynthesis({
      project_id: this.selectedProjectId,
      prompt,
      result_markdown: resultMarkdown,
      model: settings.ai.model,
      token_input: Math.round(estimateTokens(prompt)),
      token_output: Math.round(estimateTokens(resultMarkdown)),
    });
    this.synthesisExportCreatedAt = Date.now();
    this.lastSynthesisModel = settings.ai.model;
    this.showStatus(statusMessage);
  }

  private async openHistoryModal(): Promise<void> {
    if (this.selectedProjectId === '') {
      return;
    }
    this.synthesisHistory = await listSyntheses({ project_id: this.selectedProjectId });
    this.historyModalOpen = true;
  }

  private closeHistoryModal(): void {
    this.historyModalOpen = false;
  }

  private viewSynthesisFromHistory(synthesis: Synthesis): void {
    this.synthesisPrompt = extractUserInstructionFromPrompt(synthesis.prompt);
    this.synthesisMarkdown = synthesis.result_markdown;
    this.synthesisExportCreatedAt = synthesis.created_at;
    this.lastSynthesisModel = synthesis.model;
    this.resultPanelMode = 'synthesis';
    this.resultVisible = true;
    this.closeHistoryModal();
  }

  private async deleteSynthesisFromHistory(synthesis: Synthesis, event: Event): Promise<void> {
    event.stopPropagation();
    await deleteSynthesis(synthesis.id);
    this.synthesisHistory = await listSyntheses({ project_id: this.selectedProjectId });
    this.showStatus('履歴を削除しました');
  }

  private async copySynthesisFromHistory(synthesis: Synthesis, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await copySynthesisMarkdown(synthesis.result_markdown);
      this.showStatus('Markdown をコピーしました');
    } catch {
      this.showStatus('コピーに失敗しました');
    }
  }

  private getSelectedProjectName(): string {
    const project = this.projects.find((item) => item.id === this.selectedProjectId);
    return project?.name ?? 'Project';
  }

  private buildSynthesisExportMeta(createdAt: number, model: string): SynthesisExportMeta {
    return {
      createdAt,
      projectName: this.getSelectedProjectName(),
      model,
    };
  }

  private sidePanelContextToFeature(
    context: 'synthesis' | 'export' | 'qa' | 'quotes',
  ): AiFeature | null {
    switch (context) {
      case 'synthesis':
        return 'synthesis';
      case 'qa':
        return 'qa';
      case 'quotes':
        return 'quote_extract';
      default:
        return null;
    }
  }

  private openPremiumUnlockModal(context: 'synthesis' | 'export' | 'qa' | 'quotes'): void {
    this.premiumDialogMode = 'unlock';
    this.premiumHighlightFeature = this.sidePanelContextToFeature(context);
    this.premiumDialogOpen = true;
  }

  private openPurchaseModal(): void {
    this.premiumDialogMode = 'purchase';
    this.premiumHighlightFeature = null;
    this.premiumDialogOpen = true;
  }

  private closePremiumDialog(): void {
    this.premiumDialogOpen = false;
    this.premiumHighlightFeature = null;
  }

  private closeExportMenus(): void {
    this.exportMenuOpen = false;
    this.historyExportMenuId = null;
  }

  private toggleResultExportMenu(): void {
    this.historyExportMenuId = null;
    this.exportMenuOpen = !this.exportMenuOpen;
  }

  private toggleHistoryExportMenu(synthesisId: string, event: Event): void {
    event.stopPropagation();
    this.exportMenuOpen = false;
    this.historyExportMenuId =
      this.historyExportMenuId === synthesisId ? null : synthesisId;
  }

  private exportStatusMessage(format: SynthesisExportFormat): string {
    switch (format) {
      case 'markdown':
        return 'Markdown (.md) をダウンロードしました';
      case 'obsidian':
        return 'Obsidian 形式をダウンロードしました';
      case 'roam':
        return 'Roam Research 形式をダウンロードしました';
      default:
        return 'エクスポートしました';
    }
  }

  private handleExportFormat(
    format: SynthesisExportFormat,
    markdown: string,
    createdAt: number,
    model: string,
    event?: Event,
  ): void {
    event?.stopPropagation();
    if (isPremiumSynthesisExportFormat(format) && this.currentTier !== 'premium') {
      this.closeExportMenus();
      this.openPremiumUnlockModal('export');
      return;
    }

    try {
      exportSynthesis(
        this.currentTier,
        format,
        markdown,
        this.buildSynthesisExportMeta(createdAt, model),
      );
      this.showStatus(this.exportStatusMessage(format));
    } catch (error) {
      if (error instanceof SynthesisExportTierError) {
        this.closeExportMenus();
        this.openPremiumUnlockModal('export');
        return;
      }
      this.showStatus('エクスポートに失敗しました');
    }
    this.closeExportMenus();
  }

  private renderPremiumBadge(): ReturnType<typeof html> {
    return html`<span class="premium-badge">🔒 Premium</span>`;
  }

  private toggleExportMenu(): void {
    this.toggleResultExportMenu();
  }

  private handleExportFormatClick(format: SynthesisExportFormat): void {
    this.handleExportFormat(
      format,
      this.synthesisMarkdown,
      this.synthesisExportCreatedAt,
      this.lastSynthesisModel,
    );
  }

  private renderExportMenu(
    markdown: string,
    createdAt: number,
    model: string,
    menuKey: 'result' | string,
    isOpen: boolean,
  ) {
    const formats: Array<{ format: SynthesisExportFormat; label: string }> = [
      { format: 'markdown', label: 'Markdown (.md)' },
      { format: 'obsidian', label: 'Obsidian 形式' },
      { format: 'roam', label: 'Roam Research 形式' },
    ];

    return html`
      <div class="export-menu-wrap">
        <button
          type="button"
          class="btn export-menu-trigger"
          aria-expanded=${isOpen}
          aria-haspopup="menu"
          @click=${(event: Event) => {
            event.stopPropagation();
            if (menuKey === 'result') {
              this.toggleResultExportMenu();
            } else {
              this.toggleHistoryExportMenu(menuKey, event);
            }
          }}
        >
          エクスポート ▾
        </button>
        ${isOpen
          ? html`
              <div class="export-menu" role="menu" @click=${(event: Event) => event.stopPropagation()}>
                ${formats.map(
                  ({ format, label }) => html`
                    <button
                      type="button"
                      class="export-menu-item"
                      role="menuitem"
                      @click=${(event: Event) => {
                        this.handleExportFormat(format, markdown, createdAt, model, event);
                      }}
                    >
                      <span class="export-menu-item__label">${label}</span>
                      ${isPremiumSynthesisExportFormat(format) && this.currentTier !== 'premium'
                        ? this.renderPremiumBadge()
                        : nothing}
                    </button>
                  `,
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private formatHistoryDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private previewMarkdown(markdown: string, maxLength = 120): string {
    const singleLine = markdown.replace(/\s+/g, ' ').trim();
    if (singleLine.length <= maxLength) {
      return singleLine;
    }
    return `${singleLine.slice(0, maxLength)}…`;
  }

  private handleCancelSynthesis(): void {
    if (this.synthesizing) {
      this.synthesisAbortController?.abort();
      this.synthesizing = false;
      return;
    }
    if (this.extractingQuotes) {
      this.quoteAbortController?.abort();
      this.extractingQuotes = false;
      return;
    }
    this.closeResultPanel();
  }

  private closeResultPanel(): void {
    this.resultVisible = false;
    this.synthesisMarkdown = '';
    this.quotesMarkdown = '';
    this.closeExportMenus();
  }

  private isResultPanelVisible(): boolean {
    if (!this.resultVisible) {
      return false;
    }
    if (this.resultPanelMode === 'quotes') {
      return true;
    }
    return this.activeBottomTab === 'synthesis';
  }

  private async handleQuoteExtract(): Promise<void> {
    if (!canUseQuoteExtractor(this.currentTier)) {
      this.openPremiumUnlockModal('quotes');
      return;
    }

    if (this.highlights.length === 0) {
      this.showStatus('ハイライトがありません');
      return;
    }

    this.synthesisAbortController?.abort();
    this.quoteAbortController?.abort();
    const abortController = new AbortController();
    this.quoteAbortController = abortController;

    this.extractingQuotes = true;
    this.resultPanelMode = 'quotes';
    this.resultVisible = true;
    this.quotesMarkdown = '';
    this.quotesExportCreatedAt = Date.now();

    const prompt = buildQuoteExtractorPrompt(this.highlights);

    try {
      for await (const chunk of streamQuoteExtraction(prompt, {
        signal: abortController.signal,
      })) {
        this.quotesMarkdown += chunk;
      }
    } catch (error) {
      if (isSynthesisAbortError(error)) {
        if (this.quotesMarkdown === '') {
          this.resultVisible = false;
        }
        return;
      }
      this.quotesMarkdown = formatSynthesisError(error);
    } finally {
      this.extractingQuotes = false;
      if (this.quoteAbortController === abortController) {
        this.quoteAbortController = null;
      }
    }
  }

  private async copyQuotesMarkdown(): Promise<void> {
    try {
      await copySynthesisMarkdown(this.quotesMarkdown);
      this.showStatus('Markdown をコピーしました');
    } catch {
      this.showStatus('コピーに失敗しました');
    }
  }

  private downloadQuotesMarkdown(): void {
    downloadTextFile(
      this.quotesMarkdown,
      buildQuoteDownloadFilename(this.quotesExportCreatedAt),
    );
    this.showStatus('引用 Markdown をダウンロードしました');
  }

  private renderResultPanel() {
    if (this.resultPanelMode === 'quotes') {
      return html`
        <div class="result-header">
          <h2 class="result-header__title">引用抽出</h2>
          <div class="result-header__actions">
            ${this.extractingQuotes
              ? html`<span class="result-badge">抽出中</span>`
              : nothing}
            ${this.renderQuoteResultActions()}
          </div>
        </div>
        <div class="result-body">
          ${this.extractingQuotes && this.quotesMarkdown === ''
            ? html`<p class="result-placeholder">抽出中…</p>`
            : html`<markdown-it .content=${this.quotesMarkdown}></markdown-it>`}
        </div>
      `;
    }

    return html`
      <div class="result-header">
        <h2 class="result-header__title">合成結果</h2>
        <div class="result-header__actions">
          ${this.synthesizing ? html`<span class="result-badge">生成中</span>` : nothing}
          ${!this.synthesizing && !this.isSynthesisErrorMarkdown(this.synthesisMarkdown)
            ? this.renderExportMenu(
                this.synthesisMarkdown,
                this.synthesisExportCreatedAt,
                this.lastSynthesisModel,
                'result',
                this.exportMenuOpen,
              )
            : nothing}
        </div>
      </div>
      <div class="result-body">
        ${this.synthesizing && this.synthesisMarkdown === ''
          ? html`<p class="result-placeholder">生成中…</p>`
          : html`<markdown-it .content=${this.synthesisMarkdown}></markdown-it>`}
      </div>
    `;
  }

  private renderQuoteResultActions(): ReturnType<typeof html> | typeof nothing {
    if (
      this.extractingQuotes ||
      this.quotesMarkdown === '' ||
      this.isSynthesisErrorMarkdown(this.quotesMarkdown)
    ) {
      return nothing;
    }
    return html`
      <button
        type="button"
        class="btn"
        @click=${() => {
          void this.copyQuotesMarkdown();
        }}
      >
        コピー
      </button>
      <button
        type="button"
        class="btn"
        @click=${() => {
          this.downloadQuotesMarkdown();
        }}
      >
        .md ダウンロード
      </button>
    `;
  }

  private onBottomTabClick(tab: 'synthesis' | 'qa'): void {
    if (tab === 'qa' && !canUseProjectQa(this.currentTier)) {
      this.openPremiumUnlockModal('qa');
      return;
    }
    this.activeBottomTab = tab;
  }

  private onQaInput(event: Event): void {
    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }
    this.qaInput = textarea.value;
  }

  private handleCancelQa(): void {
    this.qaAbortController?.abort();
  }

  private scrollQaMessagesToEnd(): void {
    const container = this.renderRoot.querySelector('#qa-messages');
    if (container instanceof HTMLElement) {
      container.scrollTop = container.scrollHeight;
    }
  }

  private async handleQaSend(): Promise<void> {
    if (!canUseProjectQa(this.currentTier)) {
      this.openPremiumUnlockModal('qa');
      return;
    }

    const userMessage = this.qaInput.trim();
    if (userMessage === '' || this.qaStreaming) {
      return;
    }

    if (this.highlights.length === 0) {
      this.showStatus('ハイライトがありません');
      return;
    }

    this.qaInput = '';
    const priorMessages = [...this.qaMessages];
    this.qaMessages = [
      ...priorMessages,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' },
    ];
    const assistantIndex = this.qaMessages.length - 1;

    this.qaStreaming = true;
    this.qaAbortController?.abort();
    const abortController = new AbortController();
    this.qaAbortController = abortController;

    const systemInstruction = buildProjectQaSystemInstruction(this.highlights);
    const turns = buildGeminiTurnsFromSession([
      ...priorMessages,
      { role: 'user', content: userMessage },
    ]);

    try {
      for await (const chunk of streamProjectQaReply(systemInstruction, turns, {
        signal: abortController.signal,
      })) {
        const messages = [...this.qaMessages];
        const assistant = messages[assistantIndex];
        if (assistant === undefined) {
          continue;
        }
        messages[assistantIndex] = {
          role: 'assistant',
          content: assistant.content + chunk,
        };
        this.qaMessages = messages;
        this.scrollQaMessagesToEnd();
      }

      const finalAssistant = this.qaMessages[assistantIndex];
      if (finalAssistant !== undefined && finalAssistant.content.trim() === '') {
        this.qaMessages = this.qaMessages.filter((_, index) => index !== assistantIndex);
      }
    } catch (error) {
      if (isSynthesisAbortError(error)) {
        const assistant = this.qaMessages[assistantIndex];
        if (assistant === undefined || assistant.content.trim() === '') {
          this.qaMessages = this.qaMessages.filter((_, index) => index !== assistantIndex);
        }
        return;
      }
      const messages = [...this.qaMessages];
      const assistant = messages[assistantIndex];
      if (assistant !== undefined) {
        messages[assistantIndex] = {
          role: 'assistant',
          content: formatSynthesisError(error),
        };
        this.qaMessages = messages;
      }
    } finally {
      this.qaStreaming = false;
      if (this.qaAbortController === abortController) {
        this.qaAbortController = null;
      }
      this.scrollQaMessagesToEnd();
    }
  }

  private renderBottomTabs() {
    return html`
      <div class="bottom-tabs" role="tablist" aria-label="AI 機能">
        <button
          type="button"
          class="bottom-tab ${this.activeBottomTab === 'synthesis' ? 'bottom-tab--active' : ''}"
          role="tab"
          aria-selected=${this.activeBottomTab === 'synthesis'}
          aria-controls="synthesis-panel"
          id="tab-synthesis"
          title=${formatAiButtonTitle('ハイライト合成', this.currentTier, 'synthesis')}
          @click=${() => {
            this.onBottomTabClick('synthesis');
          }}
        >
          ${formatAiButtonLabel('合成', this.currentTier, 'synthesis')}
        </button>
        <button
          type="button"
          class="bottom-tab ${this.activeBottomTab === 'qa' ? 'bottom-tab--active' : ''}"
          role="tab"
          aria-selected=${this.activeBottomTab === 'qa'}
          aria-controls="qa-panel"
          id="tab-qa"
          title=${formatAiButtonTitle('プロジェクト Q&A', this.currentTier, 'qa')}
          @click=${() => {
            this.onBottomTabClick('qa');
          }}
        >
          ${formatAiButtonLabel('💬 Q&A', this.currentTier, 'qa')}
        </button>
      </div>
    `;
  }

  private renderSynthesisTab() {
    return html`
      <div
        id="synthesis-panel"
        class="bottom-tab-panel"
        role="tabpanel"
        aria-labelledby="tab-synthesis"
        ?hidden=${this.activeBottomTab !== 'synthesis'}
      >
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
            title=${formatAiButtonTitle('ハイライトを AI で合成', this.currentTier, 'synthesis')}
            ?disabled=${this.synthesizing || this.highlights.length === 0}
            @click=${() => {
              if (this.resultVisible && this.resultPanelMode === 'synthesis') {
                void this.handleRegenerate();
              } else {
                void this.handleSynthesize();
              }
            }}
          >
            ${this.synthesizing
              ? '生成中…'
              : this.resultVisible && this.resultPanelMode === 'synthesis'
                ? formatAiButtonLabel('再生成', this.currentTier, 'synthesis')
                : formatAiButtonLabel('合成する', this.currentTier, 'synthesis')}
          </button>
          <button
            type="button"
            class="btn"
            ?disabled=${!this.synthesizing && !this.extractingQuotes && !this.resultVisible}
            @click=${() => {
              this.handleCancelSynthesis();
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            class="btn"
            ?disabled=${this.selectedProjectId === ''}
            @click=${() => {
              void this.openHistoryModal();
            }}
          >
            保存履歴を見る
          </button>
          <button
            type="button"
            class="btn"
            title=${formatAiButtonTitle('印象的な引用を AI で抽出', this.currentTier, 'quote_extract')}
            ?disabled=${this.extractingQuotes || this.highlights.length === 0}
            @click=${() => {
              void this.handleQuoteExtract();
            }}
          >
            ${this.extractingQuotes
              ? '抽出中…'
              : formatAiButtonLabel('✂️ 引用抽出', this.currentTier, 'quote_extract')}
          </button>
        </div>
      </div>
    `;
  }

  private renderQaTab() {
    return html`
      <div
        id="qa-panel"
        class="bottom-tab-panel bottom-tab-panel--qa"
        role="tabpanel"
        aria-labelledby="tab-qa"
        ?hidden=${this.activeBottomTab !== 'qa'}
      >
        <div id="qa-messages" class="qa-messages" aria-live="polite">
          ${this.qaMessages.length === 0
            ? html`<p class="qa-empty">プロジェクトのハイライトについて質問できます</p>`
            : this.qaMessages.map((message) =>
                message.role === 'user'
                  ? html`
                      <div class="qa-message qa-message--user">
                        <p class="qa-message__text">${message.content}</p>
                      </div>
                    `
                  : html`
                      <div class="qa-message qa-message--assistant">
                        ${message.content === '' && this.qaStreaming
                          ? html`<p class="qa-message__placeholder">応答中…</p>`
                          : html`<markdown-it .content=${message.content}></markdown-it>`}
                      </div>
                    `,
              )}
        </div>
        <form
          class="qa-composer"
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            void this.handleQaSend();
          }}
        >
          <textarea
            class="qa-input"
            placeholder="ハイライトについて質問…"
            rows="2"
            .value=${this.qaInput}
            ?disabled=${this.qaStreaming}
            @input=${(event: Event) => {
              this.onQaInput(event);
            }}
            @keydown=${(event: KeyboardEvent) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void this.handleQaSend();
              }
            }}
          ></textarea>
          <div class="qa-actions">
            <button
              type="submit"
              class="btn btn--primary"
              title=${formatAiButtonTitle('ハイライトについて質問', this.currentTier, 'qa')}
              ?disabled=${this.qaStreaming ||
              this.qaInput.trim() === '' ||
              this.highlights.length === 0}
            >
              ${this.qaStreaming
                ? '応答中…'
                : formatAiButtonLabel('送信', this.currentTier, 'qa')}
            </button>
            <button
              type="button"
              class="btn"
              ?disabled=${!this.qaStreaming}
              @click=${() => {
                this.handleCancelQa();
              }}
            >
              停止
            </button>
          </div>
        </form>
      </div>
    `;
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
              <div class="header-top">
                <label class="panel-title" for="project-select">プロジェクト</label>
                <mw-tier-badge
                  .tier=${this.currentTier}
                  .trialRemainingLabel=${this.trialRemainingLabel}
                  ?trialUrgent=${this.trialUrgent}
                  @mw-tier-badge-click=${() => {
                    this.openPurchaseModal();
                  }}
                ></mw-tier-badge>
              </div>
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
                      ${formatProjectCoverEmoji(project.cover_emoji)} ${project.name}
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

            <section class="bottom-panel" aria-label="AI">
              ${this.renderBottomTabs()}
              ${this.renderSynthesisTab()}
              ${this.renderQaTab()}
            </section>
          </div>

          <aside
            class="result-panel ${this.isResultPanelVisible() ? 'result-panel--visible' : ''}"
            aria-label=${this.resultPanelMode === 'quotes' ? '引用抽出' : '合成結果'}
            aria-hidden=${!this.isResultPanelVisible()}
          >
            ${this.isResultPanelVisible() ? this.renderResultPanel() : nothing}
          </aside>
        </div>
      </div>

      <mw-premium-dialog
        .open=${this.premiumDialogOpen}
        .mode=${this.premiumDialogMode}
        .highlightFeature=${this.premiumHighlightFeature}
        @mw-close=${() => {
          this.closePremiumDialog();
        }}
      ></mw-premium-dialog>
      ${this.historyModalOpen
        ? html`
            <div
              class="dialog-backdrop"
              role="presentation"
              @click=${(event: Event) => {
                if (event.target === event.currentTarget) {
                  this.closeHistoryModal();
                }
              }}
            >
              <div
                class="dialog dialog--history"
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-modal-title"
                @keydown=${(event: KeyboardEvent) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    this.closeHistoryModal();
                  }
                }}
              >
                <h2 id="history-modal-title" class="dialog-title">保存履歴</h2>
                ${this.synthesisHistory.length === 0
                  ? html`<p class="dialog-message">このプロジェクトの保存履歴はありません。</p>`
                  : html`
                      <ul class="history-list">
                        ${this.synthesisHistory.map(
                          (synthesis) => html`
                            <li class="history-card">
                              <button
                                type="button"
                                class="history-card__main"
                                @click=${() => {
                                  this.viewSynthesisFromHistory(synthesis);
                                }}
                              >
                                <span class="history-card__meta">
                                  <time datetime=${new Date(synthesis.created_at).toISOString()}>
                                    ${this.formatHistoryDate(synthesis.created_at)}
                                  </time>
                                  <span class="history-card__model"
                                    >${synthesis.model} · 入力
                                    ${String(synthesis.token_input)} / 出力
                                    ${String(synthesis.token_output)}</span
                                  >
                                </span>
                                <span class="history-card__preview"
                                  >${this.previewMarkdown(synthesis.result_markdown)}</span
                                >
                              </button>
                              <div class="history-card__actions">
                                <button
                                  type="button"
                                  class="btn"
                                  @click=${(event: Event) => {
                                    void this.copySynthesisFromHistory(synthesis, event);
                                  }}
                                >
                                  Markdown コピー
                                </button>
                                ${this.renderExportMenu(
                                  synthesis.result_markdown,
                                  synthesis.created_at,
                                  synthesis.model,
                                  synthesis.id,
                                  this.historyExportMenuId === synthesis.id,
                                )}
                                <button
                                  type="button"
                                  class="btn card-btn--exclude"
                                  @click=${(event: Event) => {
                                    void this.deleteSynthesisFromHistory(synthesis, event);
                                  }}
                                >
                                  削除
                                </button>
                              </div>
                            </li>
                          `,
                        )}
                      </ul>
                    `}
                <div class="dialog-actions">
                  <button
                    type="button"
                    class="btn btn--primary"
                    @click=${() => {
                      this.closeHistoryModal();
                    }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          `
        : nothing}
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
