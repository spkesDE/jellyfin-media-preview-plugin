import { config } from '../config';
import {
  DEBUG_LEAVE_HOLD_MS,
  HOVER_MODE_AUTO,
  NO_PREVIEW_MESSAGE_ANY,
  NO_PREVIEW_MESSAGE_TRAILER,
  NO_PREVIEW_MESSAGE_TRICKPLAY,
  PREVIEW_SOURCE_PREFER_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_TRAILER,
  PREVIEW_SOURCE_TRICKPLAY,
  STATE_ATTR,
  SUPPORTED_TYPES
} from '../constants';
import { debugCardSummary, debugLog } from '../core/logger';
import { getItemIdFromCard, findCandidateCards, getImageRenderHost } from '../cards/discovery';
import {
  clearLeaveHold,
  clearPendingMove,
  ensurePreviewDom,
  hideUnavailableMessage,
  resetHoverCountdown,
  restoreCard,
  showUnavailableMessage,
  updateHoverCountdown
} from '../cards/lifecycle';
import { getOrCreateCardState } from '../cards/state';
import { runtimeState } from '../runtime';
import { applyPreview } from '../preview';
import { getPreviewUrl } from '../preview/source';
import { clamp } from '../core/dom';
import { getAdaptiveTrickplayFrameHoldMs, getTrickplayFrameIndex, clampAdaptiveDelay } from '../preview/trickplay';
import { startAutoScrub } from './autoScrub';

export function getRelativePercent(card: HTMLElement, event: MouseEvent | PointerEvent | { clientX: number }): number {
  const rect = card.getBoundingClientRect();
  if (!rect.width) {
    return 0;
  }

  return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
}

function getNoPreviewMessage(): string {
  if (config.previewSource === PREVIEW_SOURCE_TRAILER) {
    return NO_PREVIEW_MESSAGE_TRAILER;
  }

  if (config.previewSource === PREVIEW_SOURCE_TRICKPLAY) {
    return NO_PREVIEW_MESSAGE_TRICKPLAY;
  }

  if (config.previewSource === PREVIEW_SOURCE_PREFER_TRICKPLAY || config.previewSource === PREVIEW_SOURCE_PREFER_TRAILER) {
    return NO_PREVIEW_MESSAGE_ANY;
  }

  return NO_PREVIEW_MESSAGE_ANY;
}

function startHoverCountdown(state: ReturnType<typeof getOrCreateCardState>): void {
  resetHoverCountdown(state);

  if (!config.hoverCountdownEnabled || config.hoverDelayMs <= 0) {
    return;
  }

  const startedAt = window.performance.now();
  state.hoverCountdownStartedAt = startedAt;
  state.hoverCountdownDurationMs = config.hoverDelayMs;

  const tick = (timestamp: number) => {
    if (!state.pointerInside || state.hoverCountdownStartedAt === null) {
      resetHoverCountdown(state);
      return;
    }

    const elapsedMs = Math.max(0, timestamp - startedAt);
    const remainingMs = Math.max(0, config.hoverDelayMs - elapsedMs);
    updateHoverCountdown(state, remainingMs, config.hoverDelayMs);

    if (remainingMs <= 0) {
      state.hoverCountdownFrame = null;
      return;
    }

    state.hoverCountdownFrame = window.requestAnimationFrame(tick);
  };

  updateHoverCountdown(state, config.hoverDelayMs, config.hoverDelayMs);
  state.hoverCountdownFrame = window.requestAnimationFrame(tick);
}

export function runPreviewUpdate(card: HTMLElement, percent: number): void {
  const itemId = getItemIdFromCard(card);
  if (!itemId) {
    return;
  }

  const state = getOrCreateCardState(card);
  state.latestRequestToken += 1;
  const requestToken = state.latestRequestToken;

  getPreviewUrl(itemId, percent).then((preview) => {
    if (!preview) {
      return;
    }

    if (!state.previewActive || requestToken !== state.latestRequestToken) {
      return;
    }

    applyPreview(card, preview, percent);
  }).catch((error) => {
    debugLog('Preview update failed.', itemId, error);
  });
}

export function schedulePreviewUpdate(card: HTMLElement, percent: number): void {
  const state = getOrCreateCardState(card);
  state.queuedPercent = percent;
  const queueUpdateOnFrame = () => {
    if (state.queuedMoveFrame) {
      return;
    }

    state.queuedMoveFrame = window.requestAnimationFrame(() => {
      state.queuedMoveFrame = null;
      state.queuedMoveTimer = null;
      const nextPercent = state.queuedPercent || 0;
      state.lastMoveAt = Date.now();

      if (state.currentTrickplayInfo) {
        const nextFrameIndex = getTrickplayFrameIndex(state.currentTrickplayInfo, nextPercent);
        if (nextFrameIndex === state.lastRequestedTrickplayFrameIndex) {
          return;
        }

        state.lastRequestedTrickplayFrameIndex = nextFrameIndex;
      }

      runPreviewUpdate(card, nextPercent);
    });
  };

  if (!state.currentTrickplayInfo) {
    queueUpdateOnFrame();
    return;
  }

  const nextFrameIndex = getTrickplayFrameIndex(state.currentTrickplayInfo, percent);
  if (nextFrameIndex === state.lastRequestedTrickplayFrameIndex) {
    return;
  }

  const minHoldMs = config.hoverMode === HOVER_MODE_AUTO
    ? clampAdaptiveDelay(getAdaptiveTrickplayFrameHoldMs(state.currentTrickplayInfo))
    : getAdaptiveTrickplayFrameHoldMs(state.currentTrickplayInfo);
  const elapsedSinceLastRender = Date.now() - (state.lastTrickplayRenderAt || 0);
  if (elapsedSinceLastRender >= minHoldMs) {
    queueUpdateOnFrame();
    return;
  }

  if (state.queuedMoveTimer) {
    return;
  }

  state.queuedMoveTimer = window.setTimeout(() => {
    queueUpdateOnFrame();
  }, Math.max(0, minHoldMs - elapsedSinceLastRender));
}

export function handlePointerEnter(card: HTMLElement, event: PointerEvent | { pointerType?: string; clientX: number }): void {
  if (!config.enabled || event.pointerType !== 'mouse' || runtimeState.expandedTrailerSession) {
    return;
  }

  const state = getOrCreateCardState(card);
  ensurePreviewDom(card, state);
  if (state.pointerInside) {
    return;
  }

  clearLeaveHold(state);
  state.pointerInside = true;
  restoreCard(card);
  hideUnavailableMessage(state);
  debugCardSummary(card, 'Pointer entered card.');

  state.hoverTimer = window.setTimeout(() => {
    state.hoverTimer = null;
    state.previewActive = true;
    if (state.hoverCountdownFrame) {
      window.cancelAnimationFrame(state.hoverCountdownFrame);
      state.hoverCountdownFrame = null;
    }
    updateHoverCountdown(state, 0, config.hoverDelayMs);

    const itemId = getItemIdFromCard(card);
    if (!itemId) {
      resetHoverCountdown(state);
      return;
    }

    const initialPercent = config.hoverMode === HOVER_MODE_AUTO
      ? clamp((Number(config.autoScrubStartPercent) || 0) / 100, 0, 1)
      : getRelativePercent(card, event);

    getPreviewUrl(itemId, initialPercent).then((preview) => {
      if (!state.previewActive || !preview) {
        resetHoverCountdown(state);
        debugCardSummary(card, 'Hover activation found no preview source.', {
          itemId,
          previewSource: config.previewSource
        });
        if (state.previewActive && config.showNoPreviewMessage && state.pointerInside) {
          showUnavailableMessage(state, getNoPreviewMessage());
        }
        return;
      }

      resetHoverCountdown(state);
      hideUnavailableMessage(state);
      applyPreview(card, preview, initialPercent);

      if (preview.source === PREVIEW_SOURCE_TRAILER) {
        return;
      }

      if (config.hoverMode === HOVER_MODE_AUTO) {
        startAutoScrub(card);
      }
    }).catch((error) => {
      resetHoverCountdown(state);
      debugLog('Hover activation failed.', itemId, error);
    });
  }, config.hoverDelayMs);

  startHoverCountdown(state);
}

export function handlePointerMove(card: HTMLElement, event: PointerEvent | { pointerType?: string; clientX: number }): void {
  if (runtimeState.expandedTrailerSession || (event.pointerType && event.pointerType !== 'mouse')) {
    return;
  }

  const state = getOrCreateCardState(card);
  if (!state.previewActive || state.activePreviewSource === PREVIEW_SOURCE_TRAILER || config.hoverMode === HOVER_MODE_AUTO) {
    return;
  }

  schedulePreviewUpdate(card, getRelativePercent(card, event));
}

export function handlePointerLeave(card: HTMLElement, event: PointerEvent | { pointerType?: string }): void {
  if (runtimeState.expandedTrailerSession || (event.pointerType && event.pointerType !== 'mouse')) {
    return;
  }

  const state = getOrCreateCardState(card);
  state.pointerInside = false;
  if (config.debug) {
    clearLeaveHold(state);
    state.leaveHoldTimer = window.setTimeout(() => {
      state.leaveHoldTimer = null;
      if (!state.pointerInside) {
        restoreCard(card);
      }
    }, DEBUG_LEAVE_HOLD_MS);
    return;
  }

  restoreCard(card);
}

export function resetPointerTracking(card: HTMLElement, reason?: string): void {
  const state = getOrCreateCardState(card);
  state.pointerInside = false;
  clearLeaveHold(state);
  debugCardSummary(card, 'Reset pointer tracking.', { reason: reason || 'unknown' });
  if (runtimeState.expandedTrailerSession && runtimeState.expandedTrailerSession.card === card) {
    return;
  }
  restoreCard(card);
}

export function handleMouseEnter(card: HTMLElement, event: MouseEvent): void {
  if (runtimeState.expandedTrailerSession) {
    return;
  }

  const state = getOrCreateCardState(card);
  if (state.pointerInside) {
    return;
  }

  handlePointerEnter(card, {
    pointerType: 'mouse',
    clientX: event.clientX
  });
}

export function handleMouseMove(card: HTMLElement, event: MouseEvent): void {
  if (runtimeState.expandedTrailerSession) {
    return;
  }

  handlePointerMove(card, {
    pointerType: 'mouse',
    clientX: event.clientX
  });
}

export function handleMouseLeave(card: HTMLElement): void {
  if (runtimeState.expandedTrailerSession) {
    return;
  }

  const state = getOrCreateCardState(card);
  if (!state.pointerInside && !state.previewActive && !state.hoverTimer) {
    return;
  }

  handlePointerLeave(card, {
    pointerType: 'mouse'
  });
}

export function bindCard(card: HTMLElement): void {
  if (!card) {
    return;
  }

  if (!getItemIdFromCard(card)) {
    return;
  }

  if (!SUPPORTED_TYPES.has((card.getAttribute('data-type') || card.dataset.type || card.dataset.itemtype || ''))) {
    return;
  }

  const imageHost = getImageRenderHost(card);
  if (!imageHost) {
    debugCardSummary(card, 'Skipping bind because no image host was found.');
    return;
  }

  const state = getOrCreateCardState(card);
  ensurePreviewDom(card, state);

  if (card.getAttribute(STATE_ATTR) === 'true') {
    return;
  }

  const bindTarget = imageHost;

  bindTarget.addEventListener('pointerenter', (event) => {
    handlePointerEnter(card, event);
  }, { passive: true });

  bindTarget.addEventListener('pointermove', (event) => {
    handlePointerMove(card, event);
  }, { passive: true });

  bindTarget.addEventListener('pointerleave', (event) => {
    handlePointerLeave(card, event);
  }, { passive: true });

  bindTarget.addEventListener('mouseenter', (event) => {
    handleMouseEnter(card, event);
  }, { passive: true });

  bindTarget.addEventListener('mousemove', (event) => {
    handleMouseMove(card, event);
  }, { passive: true });

  bindTarget.addEventListener('mouseleave', () => {
    handleMouseLeave(card);
  }, { passive: true });

  bindTarget.addEventListener('pointercancel', () => {
    resetPointerTracking(card, 'pointercancel');
  }, { passive: true });

  bindTarget.addEventListener('contextmenu', () => {
    resetPointerTracking(card, 'contextmenu');
  }, { passive: true });

  card.setAttribute(STATE_ATTR, 'true');
  debugCardSummary(card, 'Bound card.');
}

export function bindCards(rootNode?: ParentNode | Node | null): void {
  if (!config.enabled) {
    return;
  }

  findCandidateCards(rootNode || document).forEach(bindCard);
}
