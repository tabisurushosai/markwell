import { TierLimitError, updateHighlight } from '../shared/storage/highlights.js';
import { getSettings } from '../shared/storage/settings.js';
import { t } from '../shared/utils/i18n.js';
import { saveHighlightFromRange } from './highlight-save.js';
import { syncHighlightNoteInDom } from './highlighter.js';
import { openNoteDialog } from './note-dialog.js';
import { openUpgradeModal } from '../shared/components/upgrade-modal.js';
import { getHighlightableSelection } from './selection.js';

export async function handleQuickHighlightCommand(): Promise<boolean> {
  const payload = getHighlightableSelection();
  if (payload === null) {
    return false;
  }

  const settings = await getSettings();
  try {
    await saveHighlightFromRange(payload.range, settings.default_color);
  } catch (error) {
    if (error instanceof TierLimitError) {
      void openUpgradeModal({
        featureName: t('content_feature_highlight_save'),
        limit: error.limit,
      });
      return false;
    }
    throw error;
  }
  document.getSelection()?.removeAllRanges();
  return true;
}

export async function handleHighlightWithNoteCommand(): Promise<boolean> {
  const payload = getHighlightableSelection();
  if (payload === null) {
    return false;
  }

  const settings = await getSettings();
  let highlight;
  try {
    highlight = await saveHighlightFromRange(payload.range, settings.default_color, '');
  } catch (error) {
    if (error instanceof TierLimitError) {
      void openUpgradeModal({
        featureName: t('content_feature_highlight_save'),
        limit: error.limit,
      });
      return false;
    }
    throw error;
  }
  document.getSelection()?.removeAllRanges();

  openNoteDialog({
    initialNote: highlight.note,
    onSave: async (note) => {
      await updateHighlight(highlight.id, { note });
      syncHighlightNoteInDom(highlight.id, note);
    },
  });

  return true;
}
