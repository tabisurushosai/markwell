import { jumpToHighlight } from './highlighter.js';
import { parseHighlightIdFromHash } from '../shared/utils/highlight-hash.js';

export function jumpToHighlightFromLocationHash(): boolean {
  const id = parseHighlightIdFromHash(location.hash);
  if (id === null) {
    return false;
  }
  return jumpToHighlight(id);
}

export function initHashJump(): void {
  const run = (): void => {
    jumpToHighlightFromLocationHash();
  };

  run();
  window.addEventListener('hashchange', run);
}
