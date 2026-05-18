import { describe, expect, it } from 'vitest';

import {
  MAX_VISIBLE_TOASTS,
  ToastQueue,
  TOAST_DURATION_MS,
} from '../src/shared/components/toast.js';

describe('ToastQueue', () => {
  it('shows at most MAX_VISIBLE_TOASTS at once', () => {
    const queue = new ToastQueue();
    for (let i = 0; i < MAX_VISIBLE_TOASTS; i++) {
      queue.enqueue(`toast-${String(i)}`, 'info');
    }
    expect(queue.getVisible()).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(queue.enqueue('queued', 'info')).toBeNull();
    expect(queue.getPendingCount()).toBe(1);
  });

  it('dequeues after remove', () => {
    const queue = new ToastQueue();
    for (let i = 0; i < MAX_VISIBLE_TOASTS + 1; i++) {
      queue.enqueue(`toast-${String(i)}`, 'info');
    }
    const firstId = queue.getVisible()[0]!.id;
    queue.markLeaving(firstId);
    queue.remove(firstId);
    expect(queue.getVisible()).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(queue.getVisible().some((t) => t.message === 'toast-3')).toBe(true);
    expect(queue.getPendingCount()).toBe(0);
  });
});

describe('toast durations', () => {
  it('uses 5s for error and 3s for other kinds', () => {
    expect(TOAST_DURATION_MS.error).toBe(5000);
    expect(TOAST_DURATION_MS.info).toBe(3000);
    expect(TOAST_DURATION_MS.success).toBe(3000);
    expect(TOAST_DURATION_MS.warning).toBe(3000);
  });
});
