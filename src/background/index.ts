import { runMigrations } from '../shared/storage/migrations.js';

type MarkwellCommand = 'quick_highlight' | 'open_synthesis';

type ContentRunCommandMessage = {
  type: 'RUN_COMMAND';
  command: 'quick_highlight';
};

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
    if (tab.windowId !== undefined) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
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
