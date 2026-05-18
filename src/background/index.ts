import { initContextMenu, registerContextMenus } from './context-menu.js';
import { initPageSummaryMessaging } from './page-summary.js';
import { initLicenseRecheck } from './license-recheck.js';
import { initTrialCheck } from './trial-check.js';
import { getOrCreateDeviceId } from '../shared/license/device-id.js';
import { runMigrations } from '../shared/storage/migrations.js';

type MarkwellCommand = 'quick_highlight' | 'open_synthesis';

type ContentRunCommandMessage = {
  type: 'RUN_COMMAND';
  command: 'quick_highlight';
};

initContextMenu();
initPageSummaryMessaging();
initTrialCheck();
initLicenseRecheck();

async function configureSidePanelBehavior(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
}

chrome.runtime.onInstalled.addListener(() => {
  void configureSidePanelBehavior();
  void runMigrations();
  void registerContextMenus();
  void getOrCreateDeviceId();
});

void configureSidePanelBehavior();

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return;
  }

  if (message.type === 'HIGHLIGHT_LOST' && 'highlight_id' in message) {
    const highlightId = message.highlight_id;
    console.warn('[markwell] highlight restore failed', { highlight_id: highlightId });
  }
});

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function forwardQuickHighlightToContent(tabId: number): Promise<void> {
  const message: ContentRunCommandMessage = {
    type: 'RUN_COMMAND',
    command: 'quick_highlight',
  };

  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script unavailable (blocked page, chrome://, etc.).
  }
}

async function handleCommand(command: MarkwellCommand): Promise<void> {
  const tab = await getActiveTab();
  if (tab === undefined) {
    return;
  }

  if (command === 'open_synthesis') {
    if (tab.id !== undefined) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
    return;
  }

  if (command === 'quick_highlight' && tab.id !== undefined) {
    await forwardQuickHighlightToContent(tab.id);
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick_highlight' || command === 'open_synthesis') {
    void handleCommand(command);
  }
});
