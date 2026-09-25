import { NAMESPACE } from './constants';
import { normalizeConfig } from './config';
import { ensureInjectedStyles, destroyCardBindings } from './cards/lifecycle';
import { bindUserActivationEvents, unbindUserActivationEvents } from './interaction/userActivation';
import { bindRouteEvents, unbindRouteEvents } from './core/router';
import { bindDelegatedHoverEvents, unbindDelegatedHoverEvents } from './interaction/delegatedEvents';
import { bindCards } from './interaction/hover';
import { cancelAdminNavigationRefresh, scheduleAdminNavigationRefresh } from './admin/navigation';
import { cancelScheduledScan, observePageChanges, scheduleScan } from './core/observer';
import { runtimeState } from './runtime';
import { log } from './core/logger';
import { config } from './config';
import { createPublicApi } from './publicApi';
import { destroyExpandedTrailerDom } from './trailerOverlay/expandedTrailer';
import { clearPreviewCaches } from './core/storage';
import { clearTrickplayPreloads } from './preview/preload';
import { clearUnavailableTrailerCacheState } from './preview/trailer';

export function destroy(): void {
  destroyExpandedTrailerDom();
  clearTrickplayPreloads();

  if (runtimeState.observer) {
    runtimeState.observer.disconnect();
    runtimeState.observer = null;
  }

  cancelScheduledScan();
  cancelAdminNavigationRefresh();
  unbindDelegatedHoverEvents();
  unbindRouteEvents();
  unbindUserActivationEvents();
  destroyCardBindings();
  clearPreviewCaches();
  clearUnavailableTrailerCacheState();
}

export function start(): void {
  normalizeConfig();

  if (!config.enabled) {
    log('Media Preview is disabled by config.');
    return;
  }

  ensureInjectedStyles();
  bindUserActivationEvents();
  bindRouteEvents();
  bindDelegatedHoverEvents();
  bindCards(document);
  scheduleAdminNavigationRefresh();
  observePageChanges();
  log('Media Preview initialized.');
}

export function rebind(): void {
  scheduleScan(document);
}

const api = createPublicApi(start, destroy, rebind);
window[NAMESPACE] = api as unknown as Record<string, unknown>;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

export default api;
