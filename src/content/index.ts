import { listHighlights } from '../shared/storage/highlights.js';
import { getSettings } from '../shared/storage/settings.js';
import type { Highlight } from '../shared/types/highlight.js';
import { initSelectionDetection } from './selection.js';
import { getCanonicalUrl, isPageBlocked } from '../shared/utils/url.js';

function renderHighlights(highlights: Highlight[]): void {
  // markwell-018: highlight renderer
  void highlights;
}

async function bootstrap(): Promise<void> {
  const settings = await getSettings();
  const url = location.href;
  const hostname = location.hostname;

  if (isPageBlocked(url, hostname, settings.blocked_domains, settings.blocked_url_patterns)) {
    return;
  }

  console.log('Markwell content ready');

  initSelectionDetection();

  chrome.runtime
    .sendMessage({
      type: 'CONTENT_READY',
      url,
    })
    .catch(() => {
      // Background may not be listening yet.
    });

  const highlights = await listHighlights({ url_canonical: getCanonicalUrl() });
  renderHighlights(highlights);
}

void bootstrap();
