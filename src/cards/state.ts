import type { CardState } from '../types/state';

export const cardState = new WeakMap<HTMLElement, CardState>();

export function getOrCreateCardState(card: HTMLElement): CardState {
  let state = cardState.get(card);
  if (!state) {
    state = {
      hoverTimer: null,
      leaveHoldTimer: null,
      pointerInside: false,
      previewActive: false,
      previewBackdrop: null,
      previewFrame: null,
      trailerLayer: null,
      trailerActions: null,
      trailerExpandButton: null,
      trailerMedia: null,
      trailerMediaKind: null,
      currentTrailer: null,
      trailerPlaybackStartedAt: 0,
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
      autoScrubTimer: null,
      autoScrubPercent: null,
      autoScrubDirection: 1,
      autoScrubAnimationFrame: null,
      autoScrubStartedAt: null,
      currentTrickplayInfo: null,
      lastRequestedTrickplayFrameIndex: null,
      lastRenderedTrickplayFrameIndex: null,
      lastTrickplayRenderAt: 0
    };
    cardState.set(card, state);
  }

  return state;
}
