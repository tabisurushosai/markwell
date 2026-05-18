import { getCanonicalUrl } from '../shared/utils/url.js';
import { removeAllHighlightsFromDom } from './highlighter.js';
import { restoreHighlightsForCurrentUrl } from './restore.js';

const ROUTE_DEBOUNCE_MS = 1000;
const HIDE_TOOLBARS_EVENT = 'markwell:hide-toolbars';

let trackedCanonicalUrl = getCanonicalUrl();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let routeChangeInFlight = false;

function dispatchHideAllToolbars(): void {
  document.dispatchEvent(new CustomEvent(HIDE_TOOLBARS_EVENT));
}

function scheduleRouteCheck(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void handleRouteChange();
  }, ROUTE_DEBOUNCE_MS);
}

async function handleRouteChange(): Promise<void> {
  if (routeChangeInFlight) {
    return;
  }

  const nextCanonicalUrl = getCanonicalUrl();
  if (nextCanonicalUrl === trackedCanonicalUrl) {
    return;
  }

  routeChangeInFlight = true;
  trackedCanonicalUrl = nextCanonicalUrl;

  try {
    dispatchHideAllToolbars();
    removeAllHighlightsFromDom();
    await restoreHighlightsForCurrentUrl();
  } finally {
    routeChangeInFlight = false;
  }
}

export function initSpaDetector(): void {
  trackedCanonicalUrl = getCanonicalUrl();

  window.addEventListener('popstate', scheduleRouteCheck);
  window.addEventListener('hashchange', scheduleRouteCheck);

  const observer = new MutationObserver(() => {
    scheduleRouteCheck();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
