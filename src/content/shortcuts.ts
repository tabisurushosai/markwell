import { getSettings } from '../shared/storage/settings.js';
import { saveHighlightFromRange } from './highlight-save.js';
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
