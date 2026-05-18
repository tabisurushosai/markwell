import { getSettings } from '../shared/storage/settings.js';
import { initHashJump } from './hash-jump.js';
import { initContentMessaging } from './messages.js';
import { initEditToolbar } from './edit-toolbar.js';
import { initMiniToolbar } from './mini-toolbar.js';
import { scheduleRestoreOnLoad } from './restore.js';
import { initSelectionDetection } from './selection.js';
import { isPageBlocked } from '../shared/utils/url.js';

async function bootstrap(): Promise<void> {
  const settings = await getSettings();
  const url = location.href;
  const hostname = location.hostname;

  if (isPageBlocked(url, hostname, settings.blocked_domains, settings.blocked_url_patterns)) {
    return;
  }

  console.log('Markwell content ready');

  initSelectionDetection();
  initMiniToolbar();
  initEditToolbar();
  initContentMessaging();

  chrome.runtime
    .sendMessage({
      type: 'CONTENT_READY',
      url,
    })
    .catch(() => {
      // Background may not be listening yet.
    });

  scheduleRestoreOnLoad();
  initHashJump();
}

void bootstrap();
