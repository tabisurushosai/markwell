import { runMigrations } from '../shared/storage/migrations.js';

chrome.runtime.onInstalled.addListener(() => {
  void runMigrations();
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return;
  }

  if (message.type === 'HIGHLIGHT_LOST' && 'highlight_id' in message) {
    const highlightId = message.highlight_id;
    console.warn('[markwell] highlight restore failed', { highlight_id: highlightId });
  }
});
