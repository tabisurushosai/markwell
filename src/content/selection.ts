export const MARKWELL_SELECTION_EVENT = 'markwell:selection';

export type MarkwellSelectionDetail = {
  text: string;
  range: Range;
};

const DEBOUNCE_MS = 200;
const MIN_SELECTION_LENGTH = 3;

function getElementFromNode(node: Node): Element | null {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }
  return node.parentElement;
}

function isSelectionInFormControl(range: Range): boolean {
  const element = getElementFromNode(range.commonAncestorContainer);
  return element?.closest('input, textarea') !== null;
}

function isSelectionInsideMarkedHighlight(range: Range): boolean {
  const element = getElementFromNode(range.commonAncestorContainer);
  return element?.closest('[data-markwell-id]') !== null;
}

function readActiveSelection(): { text: string; range: Range } | null {
  const selection = document.getSelection();
  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (isSelectionInFormControl(range) || isSelectionInsideMarkedHighlight(range)) {
    return null;
  }

  const text = selection.toString().trim();
  if (text.length < MIN_SELECTION_LENGTH) {
    return null;
  }

  return {
    text,
    range: range.cloneRange(),
  };
}

export function initSelectionDetection(): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleSelectionCheck = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const payload = readActiveSelection();
      if (payload === null) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent<MarkwellSelectionDetail>(MARKWELL_SELECTION_EVENT, {
          detail: payload,
        }),
      );

      console.log('markwell:selection event', payload);
    }, DEBOUNCE_MS);
  };

  document.addEventListener('mouseup', scheduleSelectionCheck);
  document.addEventListener('selectionchange', scheduleSelectionCheck);
}
