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
import { getItemIdFromCard, getItemTypeFromCard, findCandidateCards, getImageRenderHost } from '../cards/discovery';
import {
  clearLeaveHold,
  clearPendingMove,
  ensureHoverCountdown,
  ensurePreviewHost,
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
import { clearAutoScrub, startAutoScrub } from './autoScrub';

export function getRelativePercent(card: HTMLElement, event: MouseEvent | PointerEvent | { clientX: number }): number {
  const rect = card.getBoundingClientRect();
  if (!rect.width) {
    return 0;
  }

  return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
}

function getEffectiveHoverDelayMs(state: ReturnType<typeof getOrCreateCardState>): number {
  const baseDelayMs = Math.max(0, Number(config.hoverDelayMs) || 0);
  const cooldownMs = Math.max(0, Number(config.hoverCooldownMs) || 0);
  if (!cooldownMs || !state.lastPreviewEndedAt) {
    return baseDelayMs;
  }

  const cooldownRemainingMs = Math.max(0, cooldownMs - (Date.now() - state.lastPreviewEndedAt));
  return Math.max(baseDelayMs, cooldownRemainingMs);
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

function startHoverCountdown(
  card: HTMLElement,
  state: ReturnType<typeof getOrCreateCardState>,
  totalDelayMs: number
): void {
  resetHoverCountdown(state);

  if (!config.hoverCountdownEnabled || totalDelayMs <= 0) {
    return;
  }

  if (!ensurePreviewHost(card, state) || !ensureHoverCountdown(state)) {
    return;
  }

  const startedAt = window.performance.now();
  state.hoverCountdownStartedAt = startedAt;
  state.hoverCountdownDurationMs = totalDelayMs;

  const tick = (timestamp: number) => {
    if (!state.pointerInside || state.hoverCountdownStartedAt === null) {
      resetHoverCountdown(state);
      return;
    }

    const elapsedMs = Math.max(0, timestamp - startedAt);
    const remainingMs = Math.max(0, totalDelayMs - elapsedMs);
    updateHoverCountdown(state, remainingMs, totalDelayMs);

    if (remainingMs <= 0) {
      state.hoverCountdownFrame = null;
      return;
    }

    state.hoverCountdownFrame = window.requestAnimationFrame(tick);
  };

  updateHoverCountdown(state, totalDelayMs, totalDelayMs);
  state.hoverCountdownFrame = window.requestAnimationFrame(tick);
}

function clearHoverActivationTimer(state: ReturnType<typeof getOrCreateCardState>): void {
  if (state.hoverTimer) {
    window.clearTimeout(state.hoverTimer);
    state.hoverTimer = null;
  }
}

function scheduleHoverActivation(
  card: HTMLElement,
  state: ReturnType<typeof getOrCreateCardState>,
  event: PointerEvent | { pointerType?: string; clientX: number; clientY?: number }
): void {
  const effectiveDelayMs = getEffectiveHoverDelayMs(state);
  state.hoverIntentAnchorX = event.clientX;
  state.hoverIntentAnchorY = event.clientY ?? null;
  clearHoverActivationTimer(state);

  state.hoverTimer = window.setTimeout(() => {
    state.hoverTimer = null;
    state.previewActive = true;
    state.latestRequestToken += 1;
    const requestToken = state.latestRequestToken;
    if (state.hoverCountdownFrame) {
      window.cancelAnimationFrame(state.hoverCountdownFrame);
      state.hoverCountdownFrame = null;
    }
    updateHoverCountdown(state, 0, effectiveDelayMs || 1);

    const itemId = getItemIdFromCard(card);
    if (!itemId) {
      resetHoverCountdown(state);
      return;
    }
    const itemType = getItemTypeFromCard(card);

    const initialPercent = config.hoverMode === HOVER_MODE_AUTO
      ? clamp((Number(config.autoScrubStartPercent) || 0) / 100, 0, 1)
      : getRelativePercent(card, event);

    getPreviewUrl(itemId, initialPercent, itemType).then((preview) => {
      if (!state.previewActive || requestToken !== state.latestRequestToken) {
        resetHoverCountdown(state);
        return;
      }

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
      if (requestToken !== state.latestRequestToken) {
        return;
      }

      resetHoverCountdown(state);
      debugLog('Hover activation failed.', itemId, error);
    });
  }, effectiveDelayMs);

  startHoverCountdown(card, state, effectiveDelayMs);
}

function scheduleKeyboardActivation(card: HTMLElement, state: ReturnType<typeof getOrCreateCardState>): void {
  const delayMs = Math.max(0, Number(config.keyboardPreviewDelayMs) || 0);
  clearHoverActivationTimer(state);
  resetHoverCountdown(state);

  state.hoverTimer = window.setTimeout(() => {
    state.hoverTimer = null;
    state.previewActive = true;
    state.latestRequestToken += 1;
    const requestToken = state.latestRequestToken;

    const itemId = getItemIdFromCard(card);
    if (!itemId) {
      return;
    }

    const itemType = getItemTypeFromCard(card);
    const initialPercent = clamp((Number(config.keyboardPreviewStartPercent) || 0) / 100, 0, 1);

    getPreviewUrl(itemId, initialPercent, itemType).then((preview) => {
      if (!state.previewActive || requestToken !== state.latestRequestToken) {
        return;
      }

      if (!preview) {
        if (config.showNoPreviewMessage && state.focusInside) {
          showUnavailableMessage(state, getNoPreviewMessage());
        }
        return;
      }

      hideUnavailableMessage(state);
      applyPreview(card, preview, initialPercent);
    }).catch((error) => {
      if (requestToken !== state.latestRequestToken) {
        return;
      }

      debugLog('Keyboard preview activation failed.', itemId, error);
    });
  }, delayMs);
}

export function runPreviewUpdate(card: HTMLElement, percent: number): void {
  const itemId = getItemIdFromCard(card);
  if (!itemId) {
    return;
  }
  const itemType = getItemTypeFromCard(card);

  const state = getOrCreateCardState(card);
  state.latestRequestToken += 1;
  const requestToken = state.latestRequestToken;

  getPreviewUrl(itemId, percent, itemType).then((preview) => {
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

export function handlePointerEnter(card: HTMLElement, event: PointerEvent | { pointerType?: string; clientX: number; clientY?: number }): void {
  if (!config.enabled || event.pointerType !== 'mouse' || runtimeState.expandedTrailerSession) {
    return;
  }

  const state = getOrCreateCardState(card);
  if (!ensurePreviewHost(card, state)) {
    return;
  }

  if (state.pointerInside) {
    return;
  }

  clearLeaveHold(state);
  state.pointerInside = true;
  restoreCard(card);
  hideUnavailableMessage(state);
  debugCardSummary(card, 'Pointer entered card.');
  scheduleHoverActivation(card, state, event);
}

export function handlePointerMove(card: HTMLElement, event: PointerEvent | { pointerType?: string; clientX: number; clientY?: number }): void {
  if (runtimeState.expandedTrailerSession || (event.pointerType && event.pointerType !== 'mouse')) {
    return;
  }

  const state = getOrCreateCardState(card);
  if (!state.previewActive && state.pointerInside && state.hoverTimer && config.hoverIntentEnabled) {
    const thresholdPx = Math.max(0, Number(config.hoverIntentThresholdPx) || 0);
    const anchorX = state.hoverIntentAnchorX ?? event.clientX;
    const anchorY = state.hoverIntentAnchorY ?? event.clientY ?? 0;
    const nextY = event.clientY ?? anchorY;
    const distance = Math.hypot(event.clientX - anchorX, nextY - anchorY);

    if (distance > thresholdPx) {
      scheduleHoverActivation(card, state, event);
      return;
    }
  }

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
  state.lastPreviewEndedAt = Date.now();
  if (state.focusInside) {
    return;
  }

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
  state.lastPreviewEndedAt = Date.now();
  clearLeaveHold(state);
  debugCardSummary(card, 'Reset pointer tracking.', { reason: reason || 'unknown' });
  if (runtimeState.expandedTrailerSession && runtimeState.expandedTrailerSession.card === card) {
    return;
  }
  if (state.focusInside) {
    return;
  }
  restoreCard(card);
}

export function handleFocusEnter(card: HTMLElement): void {
  if (!config.enabled || !config.keyboardPreviewEnabled || runtimeState.expandedTrailerSession) {
    return;
  }

  const state = getOrCreateCardState(card);
  if (!ensurePreviewHost(card, state)) {
    return;
  }

  if (state.focusInside || state.pointerInside) {
    return;
  }

  state.focusInside = true;
  restoreCard(card);
  hideUnavailableMessage(state);
  debugCardSummary(card, 'Keyboard focus entered card.');
  scheduleKeyboardActivation(card, state);
}

export function handleFocusLeave(card: HTMLElement): void {
  if (runtimeState.expandedTrailerSession) {
    return;
  }

  const state = getOrCreateCardState(card);
  state.focusInside = false;
  state.lastPreviewEndedAt = Date.now();
  if (state.pointerInside) {
    return;
  }

  restoreCard(card);
}

export function handleKeyboardPreviewKey(card: HTMLElement, event: KeyboardEvent): void {
  if (!config.enabled || !config.keyboardPreviewEnabled || runtimeState.expandedTrailerSession) {
    return;
  }

  const state = getOrCreateCardState(card);
  if (event.key === 'Escape' && config.keyboardEscapeClosesPreview && state.previewActive) {
    event.preventDefault();
    state.focusInside = false;
    restoreCard(card);
    return;
  }

  if (!config.keyboardArrowScrubEnabled || !state.previewActive || state.activePreviewSource === PREVIEW_SOURCE_TRAILER) {
    return;
  }

  let nextPercent: number | null = null;
  const step = clamp((Number(config.keyboardArrowStepPercent) || 8) / 100, 0.01, 1);
  const currentPercent = state.currentTrickplayInfo && state.lastRenderedTrickplayFrameIndex !== null
    ? clamp(
      state.lastRenderedTrickplayFrameIndex / Math.max(1, state.currentTrickplayInfo.thumbnailCount - 1),
      0,
      1
    )
    : clamp((Number(config.keyboardPreviewStartPercent) || 50) / 100, 0, 1);

  if (event.key === 'ArrowLeft') {
    nextPercent = Math.max(0, currentPercent - step);
  } else if (event.key === 'ArrowRight') {
    nextPercent = Math.min(1, currentPercent + step);
  } else if (event.key === 'Home') {
    nextPercent = 0;
  } else if (event.key === 'End') {
    nextPercent = 1;
  }

  if (nextPercent === null) {
    return;
  }

  event.preventDefault();
  clearAutoScrub(state);
  schedulePreviewUpdate(card, nextPercent);
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
    clientX: event.clientX,
    clientY: event.clientY
  });
}

export function handleMouseMove(card: HTMLElement, event: MouseEvent): void {
  if (runtimeState.expandedTrailerSession) {
    return;
  }

  handlePointerMove(card, {
    pointerType: 'mouse',
    clientX: event.clientX,
    clientY: event.clientY
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

  const itemType = card.getAttribute('data-type') || card.dataset.type || card.dataset.itemtype || '';
  if (itemType && !SUPPORTED_TYPES.has(itemType)) {
    return;
  }

  const imageHost = getImageRenderHost(card);
  if (!imageHost) {
    debugCardSummary(card, 'Skipping bind because no image host was found.');
    return;
  }

  const state = getOrCreateCardState(card);

  if (card.getAttribute(STATE_ATTR) === 'true') {
    return;
  }

  const bindTarget = imageHost;
  const onPointerEnter = (event: PointerEvent) => {
    handlePointerEnter(card, event);
  };
  const onPointerMove = (event: PointerEvent) => {
    handlePointerMove(card, event);
  };
  const onPointerLeave = (event: PointerEvent) => {
    handlePointerLeave(card, event);
  };
  const onMouseEnter = (event: MouseEvent) => {
    handleMouseEnter(card, event);
  };
  const onMouseMove = (event: MouseEvent) => {
    handleMouseMove(card, event);
  };
  const onMouseLeave = () => {
    handleMouseLeave(card);
  };
  const onPointerCancel = () => {
    resetPointerTracking(card, 'pointercancel');
  };
  const onContextMenu = () => {
    resetPointerTracking(card, 'contextmenu');
  };

  bindTarget.addEventListener('pointerenter', onPointerEnter, { passive: true });
  bindTarget.addEventListener('pointermove', onPointerMove, { passive: true });
  bindTarget.addEventListener('pointerleave', onPointerLeave, { passive: true });
  bindTarget.addEventListener('mouseenter', onMouseEnter, { passive: true });
  bindTarget.addEventListener('mousemove', onMouseMove, { passive: true });
  bindTarget.addEventListener('mouseleave', onMouseLeave, { passive: true });
  bindTarget.addEventListener('pointercancel', onPointerCancel, { passive: true });
  bindTarget.addEventListener('contextmenu', onContextMenu, { passive: true });

  state.boundTarget = bindTarget;
  state.boundHandlers = {
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
    onMouseEnter,
    onMouseMove,
    onMouseLeave,
    onPointerCancel,
    onContextMenu
  };
  card.setAttribute(STATE_ATTR, 'true');
  debugCardSummary(card, 'Bound card.');
}

export function bindCards(rootNode?: ParentNode | Node | null): void {
  if (!config.enabled) {
    return;
  }

  findCandidateCards(rootNode || document).forEach(bindCard);
}
