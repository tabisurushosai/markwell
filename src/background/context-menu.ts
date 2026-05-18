const MENU_HIGHLIGHT_SELECTION = 'markwell-highlight-selection';
const MENU_HIGHLIGHT_NOTE = 'markwell-highlight-note';
const MENU_OPEN_SIDE_PANEL = 'markwell-open-side-panel';

type ContentRunCommandMessage = {
  type: 'RUN_COMMAND';
  command: 'quick_highlight' | 'highlight_with_note';
};

export async function registerContextMenus(): Promise<void> {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: MENU_HIGHLIGHT_SELECTION,
    title: 'Markwell: Highlight selection',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: MENU_HIGHLIGHT_NOTE,
    title: 'Markwell: Highlight + add note',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: MENU_OPEN_SIDE_PANEL,
    title: 'Markwell: Open Markwell side panel',
    contexts: ['page'],
  });
}

async function sendRunCommandToTab(
  tabId: number,
  command: ContentRunCommandMessage['command'],
): Promise<void> {
  const message: ContentRunCommandMessage = { type: 'RUN_COMMAND', command };

  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script unavailable (blocked page, chrome://, etc.).
  }
}

async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  if (tab?.id === undefined) {
    return;
  }

  switch (info.menuItemId) {
    case MENU_HIGHLIGHT_SELECTION:
      await sendRunCommandToTab(tab.id, 'quick_highlight');
      return;
    case MENU_HIGHLIGHT_NOTE:
      await sendRunCommandToTab(tab.id, 'highlight_with_note');
      return;
    case MENU_OPEN_SIDE_PANEL:
      if (tab.id !== undefined) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
      return;
    default:
      return;
  }
}

export function initContextMenu(): void {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    void handleContextMenuClick(info, tab);
  });
}
