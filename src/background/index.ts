import { runMigrations } from '../shared/storage/migrations.js';

chrome.runtime.onInstalled.addListener(() => {
  void runMigrations();
});
