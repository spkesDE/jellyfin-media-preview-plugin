import type { ExpandedTrailerDom, ExpandedTrailerSession } from './types/preview';

export const runtimeState = {
  observer: null as MutationObserver | null,
  routeEventsBound: false,
  routeEventHandler: null as (() => void) | null,
  originalHistoryPushState: null as History['pushState'] | null,
  originalHistoryReplaceState: null as History['replaceState'] | null,
  delegatedHoverEventsBound: false,
  delegatedHoverHandlers: null as {
    onPointerOver: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerOut: (event: PointerEvent) => void;
    onMouseOver: (event: MouseEvent) => void;
    onMouseMove: (event: MouseEvent) => void;
    onMouseOut: (event: MouseEvent) => void;
  } | null,
  userActivationEventsBound: false,
  userActivationHandler: null as (() => void) | null,
  scanScheduled: false,
  scanFrame: null as number | null,
  pendingScanRoots: new Set<ParentNode | Node>(),
  adminNavRefreshScheduled: false,
  adminNavRefreshFrame: null as number | null,
  historyPatched: false,
  pageHasUserActivation: false,
  expandedTrailerSession: null as ExpandedTrailerSession | null,
  expandedTrailerDom: null as ExpandedTrailerDom | null
};
