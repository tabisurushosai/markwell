import { updateHighlight } from '../shared/storage/highlights.js';
import { getSettings } from '../shared/storage/settings.js';
import { saveHighlightFromRange } from './highlight-save.js';
import { syncHighlightNoteInDom } from './highlighter.js';
import { openNoteDialog } from './note-dialog.js';
import { getHighlightableSelection } from './selection.js';

export async function handleQuickHighlightCommand(): Promise<boolean> {
  const payload = getHighlightableSelection();
  if (payload === null) {
    return false;
  }

  const settings = await getSettings();
  await saveHighlightFromRange(payload.range, settings.default_color);
  document.getSelection()?.removeAllRanges();
  return true;
}

export async function handleHighlightWithNoteCommand(): Promise<boolean> {
  const payload = getHighlightableSelection();
  if (payload === null) {
    return false;
  }

  const settings = await getSettings();
  const highlight = await saveHighlightFromRange(payload.range, settings.default_color, '');
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
