import type { ExpandedTrailerDom, ExpandedTrailerSession } from './types/preview';

export const runtimeState = {
  observer: null as MutationObserver | null,
  routeEventsBound: false,
  delegatedHoverEventsBound: false,
  userActivationEventsBound: false,
  scanScheduled: false,
  adminNavRefreshScheduled: false,
  historyPatched: false,
  pageHasUserActivation: false,
  expandedTrailerSession: null as ExpandedTrailerSession | null,
  expandedTrailerDom: null as ExpandedTrailerDom | null
};
