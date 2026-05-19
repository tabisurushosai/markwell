/** Compute insert index (0..length) from drag position */
export function computeInsertIndex(
  clientY: number,
  itemTop: number,
  itemHeight: number,
  listIndex: number,
): number {
  const mid = itemTop + itemHeight / 2;
  return clientY < mid ? listIndex : listIndex + 1;
}

/** New array with the element at fromIndex moved to insertIndex */
export function reorderByIndex<T>(items: readonly T[], fromIndex: number, insertIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length) {
    return [...items];
  }
  if (insertIndex === fromIndex || insertIndex === fromIndex + 1) {
    return [...items];
  }
  const next = [...items];
  const [removed] = next.splice(fromIndex, 1);
  const target = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
  next.splice(target, 0, removed);
  return next;
}
