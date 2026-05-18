/** テキスト入力中は矢印キーを奪わない */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLSelectElement) {
    return true;
  }
  return target.isContentEditable;
}

/** Tab / Shift+Tab でビュータブを切り替える対象か */
export function shouldCycleViewTabs(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (isEditableElement(target)) {
    return false;
  }
  if (target.closest('.footer')) {
    return false;
  }
  if (target.closest('.copy-menu')) {
    return false;
  }
  return true;
}

export function clampIndex(index: number, length: number): number {
  if (length === 0) {
    return -1;
  }
  if (index < 0) {
    return -1;
  }
  if (index >= length) {
    return length - 1;
  }
  return index;
}
