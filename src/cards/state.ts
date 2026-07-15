import type { CardState } from '../types/state';

export const cardState = new WeakMap<HTMLElement, CardState>();

export function getOrCreateCardState(card: HTMLElement): CardState {
  let state = cardState.get(card);
  if (!state) {
    state = {
      hoverTimer: null,
      hoverCountdownFrame: null,
      hoverCountdownStartedAt: null,
      hoverCountdownDurationMs: 0,
      hoverIntentAnchorX: null,
      hoverIntentAnchorY: null,
      leaveHoldTimer: null,
      lastPreviewEndedAt: 0,
      focusInside: false,
      pointerInside: false,
      previewActive: false,
      previewBackdrop: null,
      previewFrame: null,
      previewFrameSecondary: null,
      activePreviewFrameSlot: 'primary',
      previewTransitionTimer: null,
      hoverCountdown: null,
      hoverCountdownLabel: null,
      unavailableMessage: null,
      trailerLayer: null,
      trailerActions: null,
      trailerExpandButton: null,
      trailerMedia: null,
      trailerMediaKind: null,
      trailerTransitionTimer: null,
      currentTrailer: null,
      trailerPlaybackStartedAt: 0,
      metadataOverlay: null,
      metadataOverlayTitle: null,
      metadataOverlayMeta: null,
      progress: null,
      progressBar: null,
      lastPreviewKey: null,
      activePreviewSource: null,
      lastMoveAt: 0,
      queuedPercent: null,
      queuedMoveTimer: null,
      queuedMoveFrame: null,
      latestRequestToken: 0,
      rootHost: null,
      managedHostPosition: null,
      managedHostOverflow: null,
      widePreviewCard: null,
      widePreviewCleanupTimer: null,
      autoScrubTimer: null,
      autoScrubPercent: null,
      autoScrubAnimationFrame: null,
      autoScrubStartedAt: null,
      currentTrickplayInfo: null,
      lastRequestedTrickplayFrameIndex: null,
      lastRenderedTrickplayFrameIndex: null,
      lastTrickplayRenderAt: 0,
      boundTarget: null,
      boundHandlers: null
    };
    cardState.set(card, state);
  }

  return state;
}
