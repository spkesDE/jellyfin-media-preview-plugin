import { NAMESPACE } from './constants';
import { normalizeConfig } from './config';
import { ensureInjectedStyles, destroyCardBindings } from './cards/lifecycle';
import { bindUserActivationEvents } from './interaction/userActivation';
import { bindRouteEvents } from './core/router';
import { bindDelegatedHoverEvents } from './interaction/delegatedEvents';
import { bindCards } from './interaction/hover';
import { scheduleAdminNavigationRefresh } from './admin/navigation';
import { observePageChanges, scheduleScan } from './core/observer';
import { runtimeState } from './runtime';
import { debugLog, log } from './core/logger';
import { config } from './config';
import { createPublicApi } from './publicApi';
import { collapseExpandedTrailer } from './trailerOverlay/expandedTrailer';

export function destroy(): void {
  if (runtimeState.expandedTrailerSession) {
    collapseExpandedTrailer({ immediate: true });
  }

  if (runtimeState.observer) {
    runtimeState.observer.disconnect();
    runtimeState.observer = null;
  }

  destroyCardBindings();
}

export function start(): void {
  normalizeConfig();

  if (!config.enabled) {
    log('Hover scrub is disabled by config.');
    return;
  }

  if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    log('Skipping media preview because the current device does not advertise precise hover.');
    return;
  }

  ensureInjectedStyles();
  bindUserActivationEvents();
  bindRouteEvents();
  bindDelegatedHoverEvents();
  bindCards(document);
  scheduleAdminNavigationRefresh();
  observePageChanges();
  log('Hover scrub initialized.');
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
