import { ADMIN_NAV_LINK_ATTR, STATE_ATTR, STYLE_ID } from '../constants';
import { config } from '../config';
import { getPreviewBackdropStyles } from './layout';
import { getImageRenderHost } from './discovery';
import { getOrCreateCardState } from './state';
import { clearTrailerMedia } from '../preview/renderTrailer';
import { expandTrailer } from '../trailerOverlay/expandedTrailer';
import { clearAutoScrub } from '../interaction/autoScrub';
import { runtimeState } from '../runtime';
import mediaPreviewGlobalStyles from '../styles/mediaPreviewGlobal.css';
import mediaPreviewHoverStyles from '../styles/mediaPreviewHover.css';
import mediaPreviewTrailerStyles from '../styles/mediaPreviewTrailer.css';
import mediaPreviewExpandedTrailerStyles from '../styles/mediaPreviewExpandedTrailer.css';
import type { CardState } from '../types/state';

const mediaPreviewStyles = [
  mediaPreviewGlobalStyles,
  mediaPreviewHoverStyles,
  mediaPreviewTrailerStyles,
  mediaPreviewExpandedTrailerStyles
].join('\n');

export function ensureInjectedStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = mediaPreviewStyles;
  document.head.appendChild(style);
}

export function ensurePreviewHost(card: HTMLElement, state: CardState): CardState | null {
  const imageHost = getImageRenderHost(card);
  if (!imageHost) {
    return null;
  }

  const positionedHost = imageHost;
  if (window.getComputedStyle(positionedHost).position === 'static') {
    positionedHost.style.position = 'relative';
  }
  if (window.getComputedStyle(positionedHost).overflow !== 'hidden') {
    positionedHost.style.overflow = 'hidden';
  }

  state.rootHost = positionedHost;
  return state;
}

export function ensurePreviewBackdrop(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.previewBackdrop) {
    const previewBackdrop = document.createElement('div');
    previewBackdrop.className = 'jmp-preview-backdrop';
    previewBackdrop.setAttribute('aria-hidden', 'true');
    state.rootHost.appendChild(previewBackdrop);
    state.previewBackdrop = previewBackdrop;
  }

  return state.previewBackdrop;
}

export function ensurePreviewFrame(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.previewFrame) {
    const previewFrame = document.createElement('div');
    previewFrame.className = 'jmp-preview-layer';
    previewFrame.setAttribute('aria-hidden', 'true');
    previewFrame.style.display = 'none';
    state.rootHost.appendChild(previewFrame);
    state.previewFrame = previewFrame;
  }

  return state.previewFrame;
}

export function ensureHoverCountdown(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.hoverCountdown) {
    const hoverCountdown = document.createElement('div');
    hoverCountdown.className = 'jmp-hover-countdown';
    hoverCountdown.setAttribute('aria-hidden', 'true');
    hoverCountdown.style.display = 'none';
    hoverCountdown.style.setProperty('--progress', '1');

    const hoverCountdownLabel = document.createElement('span');
    hoverCountdownLabel.className = 'jmp-hover-countdown-label';
    hoverCountdownLabel.textContent = '1';
    hoverCountdown.appendChild(hoverCountdownLabel);
    state.rootHost.appendChild(hoverCountdown);

    state.hoverCountdown = hoverCountdown;
    state.hoverCountdownLabel = hoverCountdownLabel;
  }

  applyHoverCountdownSettings(state);
  return state.hoverCountdown;
}

export function ensureUnavailableMessage(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.unavailableMessage) {
    const unavailableMessage = document.createElement('div');
    unavailableMessage.className = 'jmp-unavailable-message';
    unavailableMessage.setAttribute('aria-hidden', 'true');
    unavailableMessage.style.display = 'none';
    state.rootHost.appendChild(unavailableMessage);
    state.unavailableMessage = unavailableMessage;
  }

  return state.unavailableMessage;
}

export function ensureTrailerLayer(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.trailerLayer) {
    const trailerLayer = document.createElement('div');
    trailerLayer.className = 'jmp-trailer-layer';
    trailerLayer.setAttribute('aria-hidden', 'true');
    state.rootHost.appendChild(trailerLayer);
    state.trailerLayer = trailerLayer;
  }

  return state.trailerLayer;
}

export function ensureTrailerActions(card: HTMLElement, state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.trailerActions) {
    const trailerActions = document.createElement('div');
    trailerActions.className = 'jmp-trailer-actions';
    trailerActions.setAttribute('aria-hidden', 'true');
    trailerActions.style.display = 'none';

    const trailerExpandButton = document.createElement('button');
    trailerExpandButton.className = 'jmp-trailer-expand';
    trailerExpandButton.type = 'button';
    trailerExpandButton.title = 'Expand trailer';
    trailerExpandButton.setAttribute('aria-label', 'Expand trailer');
    trailerExpandButton.innerHTML = '<span class="material-icons" aria-hidden="true">open_in_full</span>';
    trailerExpandButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      expandTrailer(card);
    });
    trailerExpandButton.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    trailerActions.appendChild(trailerExpandButton);
    state.rootHost.appendChild(trailerActions);

    state.trailerActions = trailerActions;
    state.trailerExpandButton = trailerExpandButton;
  }

  applyTrailerExpandButtonSettings(state);
  return state.trailerActions;
}

export function ensureProgress(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.progress) {
    const progress = document.createElement('div');
    progress.className = 'jmp-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.style.display = 'none';

    const progressBar = document.createElement('div');
    progressBar.className = 'jmp-progress-bar';
    progress.appendChild(progressBar);
    state.rootHost.appendChild(progress);

    state.progress = progress;
    state.progressBar = progressBar;
  }

  return state.progress;
}

export function resetPreviewBackdrop(state: CardState | null | undefined): void {
  if (!state?.previewBackdrop) {
    return;
  }

  const style = state.previewBackdrop.style as CSSStyleDeclaration & {
    webkitBackdropFilter: string;
  };
  state.previewBackdrop.style.display = 'none';
  state.previewBackdrop.style.zIndex = '10';
  state.previewBackdrop.style.background = 'transparent';
  style.backdropFilter = 'none';
  style.webkitBackdropFilter = 'none';
}

export function applyHoverCountdownSettings(state: CardState | null | undefined): void {
  if (!state?.hoverCountdown) {
    return;
  }

  state.hoverCountdown.classList.remove('pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right');
  state.hoverCountdown.classList.add(`pos-${config.hoverCountdownPosition}`);
}

export function updateHoverCountdown(state: CardState | null | undefined, remainingMs: number, totalMs: number): void {
  const hoverCountdown = ensureHoverCountdown(state);
  const hoverCountdownLabel = state?.hoverCountdownLabel;
  if (!hoverCountdown || !hoverCountdownLabel) {
    return;
  }

  applyHoverCountdownSettings(state);
  const safeTotalMs = Math.max(1, totalMs);
  const clampedRemainingMs = Math.max(0, remainingMs);
  const progress = Math.max(0, Math.min(1, clampedRemainingMs / safeTotalMs));
  const secondsRemaining = Math.max(0, Math.ceil(clampedRemainingMs / 1000));

  hoverCountdown.style.display = 'block';
  hoverCountdown.style.setProperty('--progress', progress.toFixed(4));
  hoverCountdownLabel.textContent = String(secondsRemaining);
}

export function resetHoverCountdown(state: CardState | null | undefined): void {
  if (state?.hoverCountdownFrame) {
    window.cancelAnimationFrame(state.hoverCountdownFrame);
    state.hoverCountdownFrame = null;
  }

  if (!state?.hoverCountdown || !state.hoverCountdownLabel) {
    return;
  }

  state.hoverCountdownStartedAt = null;
  state.hoverCountdownDurationMs = 0;
  state.hoverCountdown.style.display = 'none';
  state.hoverCountdown.style.setProperty('--progress', '1');
  state.hoverCountdownLabel.textContent = '1';
}

export function showUnavailableMessage(state: CardState | null | undefined, message: string): void {
  const unavailableMessage = ensureUnavailableMessage(state);
  if (!unavailableMessage) {
    return;
  }

  unavailableMessage.textContent = message;
  unavailableMessage.style.display = 'block';
}

export function hideUnavailableMessage(state: CardState | null | undefined): void {
  if (!state?.unavailableMessage) {
    return;
  }

  state.unavailableMessage.style.display = 'none';
  state.unavailableMessage.textContent = '';
}

export function setTrailerExpandVisible(state: CardState | null | undefined, isVisible: boolean): void {
  if (!state?.trailerActions) {
    return;
  }

  applyTrailerExpandButtonSettings(state);
  state.trailerActions.style.display = isVisible && config.trailerExpandButtonEnabled ? 'block' : 'none';
}

export function applyTrailerExpandButtonSettings(state: CardState | null | undefined): void {
  if (!state?.trailerActions) {
    return;
  }

  state.trailerActions.classList.remove('pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right');
  state.trailerActions.classList.add(`pos-${config.trailerExpandButtonPosition}`);
}

export function applyPreviewBackdrop(state: CardState | null | undefined): void {
  const backdropStyles = getPreviewBackdropStyles();
  const shouldShow = !(backdropStyles.background === 'transparent' && backdropStyles.backdropFilter === 'none');
  if (!shouldShow && !state?.previewBackdrop) {
    return;
  }

  if (shouldShow && !ensurePreviewBackdrop(state)) {
    return;
  }

  if (!state?.previewBackdrop) {
    return;
  }

  const style = state.previewBackdrop.style as CSSStyleDeclaration & {
    webkitBackdropFilter: string;
  };

  style.display = shouldShow ? 'block' : 'none';
  style.background = backdropStyles.background;
  style.backdropFilter = backdropStyles.backdropFilter;
  style.webkitBackdropFilter = backdropStyles.webkitBackdropFilter;
}

export function setTrailerLayerVisible(state: CardState | null | undefined, isVisible: boolean): void {
  if (!state?.trailerLayer) {
    return;
  }

  state.trailerLayer.style.display = isVisible ? 'block' : 'none';
  state.trailerLayer.style.visibility = isVisible ? 'visible' : 'hidden';
  state.trailerLayer.style.opacity = isVisible ? '1' : '0';
}

export function hidePreviewFrame(state: CardState | null | undefined): void {
  if (!state?.previewFrame) {
    return;
  }

  state.previewFrame.style.display = 'none';
  state.previewFrame.style.backgroundImage = '';
}

export function showProgress(state: CardState | null | undefined, percent: number | null | undefined): void {
  const progress = ensureProgress(state);
  const progressBar = state?.progressBar;
  if (!progress || !progressBar) {
    return;
  }

  progress.style.display = '';
  progressBar.style.width = `${Math.round((percent || 0) * 100)}%`;
}

export function hideProgress(state: CardState | null | undefined): void {
  if (!state?.progress) {
    return;
  }

  state.progress.style.display = 'none';
}

export function clearPendingMove(state: CardState | null | undefined): void {
  if (state?.queuedMoveTimer) {
    window.clearTimeout(state.queuedMoveTimer);
    state.queuedMoveTimer = null;
  }

  if (state?.queuedMoveFrame) {
    window.cancelAnimationFrame(state.queuedMoveFrame);
    state.queuedMoveFrame = null;
  }
}

export function clearLeaveHold(state: CardState | null | undefined): void {
  if (state?.leaveHoldTimer) {
    window.clearTimeout(state.leaveHoldTimer);
    state.leaveHoldTimer = null;
  }
}

export function restoreCard(card: HTMLElement): void {
  const state = getOrCreateCardState(card);
  if (!state) {
    return;
  }

  if (runtimeState.expandedTrailerSession && runtimeState.expandedTrailerSession.card === card) {
    return;
  }

  if (state.hoverTimer) {
    window.clearTimeout(state.hoverTimer);
    state.hoverTimer = null;
  }

  clearLeaveHold(state);
  clearPendingMove(state);
  clearAutoScrub(state);
  state.latestRequestToken += 1;
  state.previewActive = false;
  state.lastPreviewKey = null;
  state.activePreviewSource = null;
  state.queuedPercent = null;
  state.autoScrubPercent = null;
  state.currentTrickplayInfo = null;
  state.lastRequestedTrickplayFrameIndex = null;
  state.lastRenderedTrickplayFrameIndex = null;
  state.lastTrickplayRenderAt = 0;
  resetHoverCountdown(state);
  hideUnavailableMessage(state);

  if (config.restoreOnLeave) {
    hidePreviewFrame(state);
  }

  clearTrailerMedia(state);
  resetPreviewBackdrop(state);
  hideProgress(state);
}

export function destroyCardBindings(): void {
  document.querySelectorAll(`[${ADMIN_NAV_LINK_ATTR}="true"]`).forEach((entry) => {
    entry.remove();
  });

  document.querySelectorAll(`[${STATE_ATTR}="true"]`).forEach((card) => {
    if (card instanceof HTMLElement) {
      const state = getOrCreateCardState(card);
      if (state.boundTarget && state.boundHandlers) {
        state.boundTarget.removeEventListener('pointerenter', state.boundHandlers.onPointerEnter);
        state.boundTarget.removeEventListener('pointermove', state.boundHandlers.onPointerMove);
        state.boundTarget.removeEventListener('pointerleave', state.boundHandlers.onPointerLeave);
        state.boundTarget.removeEventListener('mouseenter', state.boundHandlers.onMouseEnter);
        state.boundTarget.removeEventListener('mousemove', state.boundHandlers.onMouseMove);
        state.boundTarget.removeEventListener('mouseleave', state.boundHandlers.onMouseLeave);
        state.boundTarget.removeEventListener('pointercancel', state.boundHandlers.onPointerCancel);
        state.boundTarget.removeEventListener('contextmenu', state.boundHandlers.onContextMenu);
      }

      state.boundTarget = null;
      state.boundHandlers = null;
      restoreCard(card);
      card.removeAttribute(STATE_ATTR);
    }
  });
}
