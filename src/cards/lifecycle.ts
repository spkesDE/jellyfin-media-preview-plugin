import { ADMIN_NAV_LINK_ATTR, STATE_ATTR, STYLE_ID } from '../constants';
import { config } from '../config';
import { getPreviewBackdropStyles } from './layout';
import { getImageRenderHost } from './discovery';
import { getOrCreateCardState } from './state';
import { clearTrailerMedia } from '../preview/renderTrailer';
import { expandTrailer } from '../trailerOverlay/expandedTrailer';
import { clearAutoScrub } from '../interaction/autoScrub';
import { runtimeState } from '../runtime';
import { mediaPreviewStyles } from '../styles/mediaPreviewStyles';
import type { CardState } from '../types/state';

export function ensureInjectedStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = mediaPreviewStyles;
  document.head.appendChild(style);
}

export function ensurePreviewDom(card: HTMLElement, state: CardState): CardState | null {
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

  if (!state.previewBackdrop) {
    const previewBackdrop = document.createElement('div');
    previewBackdrop.className = 'jhs-preview-backdrop';
    previewBackdrop.setAttribute('aria-hidden', 'true');
    positionedHost.appendChild(previewBackdrop);
    state.previewBackdrop = previewBackdrop;
  }

  if (!state.previewFrame) {
    const previewFrame = document.createElement('div');
    previewFrame.className = 'jhs-preview-layer';
    previewFrame.setAttribute('aria-hidden', 'true');
    previewFrame.style.display = 'none';
    positionedHost.appendChild(previewFrame);
    state.previewFrame = previewFrame;
  }

  if (!state.hoverCountdown) {
    const hoverCountdown = document.createElement('div');
    hoverCountdown.className = 'jhs-hover-countdown';
    hoverCountdown.setAttribute('aria-hidden', 'true');
    hoverCountdown.style.display = 'none';
    hoverCountdown.style.setProperty('--progress', '1');

    const hoverCountdownLabel = document.createElement('span');
    hoverCountdownLabel.className = 'jhs-hover-countdown-label';
    hoverCountdownLabel.textContent = '1';
    hoverCountdown.appendChild(hoverCountdownLabel);
    positionedHost.appendChild(hoverCountdown);

    state.hoverCountdown = hoverCountdown;
    state.hoverCountdownLabel = hoverCountdownLabel;
  }

  if (!state.unavailableMessage) {
    const unavailableMessage = document.createElement('div');
    unavailableMessage.className = 'jhs-unavailable-message';
    unavailableMessage.setAttribute('aria-hidden', 'true');
    unavailableMessage.style.display = 'none';
    positionedHost.appendChild(unavailableMessage);
    state.unavailableMessage = unavailableMessage;
  }

  if (!state.trailerLayer) {
    const trailerLayer = document.createElement('div');
    trailerLayer.className = 'jhs-trailer-layer';
    trailerLayer.setAttribute('aria-hidden', 'true');
    positionedHost.appendChild(trailerLayer);
    state.trailerLayer = trailerLayer;
  }

  if (!state.trailerActions) {
    const trailerActions = document.createElement('div');
    trailerActions.className = 'jhs-trailer-actions';
    trailerActions.setAttribute('aria-hidden', 'true');
    trailerActions.style.display = 'none';

    const trailerExpandButton = document.createElement('button');
    trailerExpandButton.className = 'jhs-trailer-expand';
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
    positionedHost.appendChild(trailerActions);

    state.trailerActions = trailerActions;
    state.trailerExpandButton = trailerExpandButton;
  }

  applyTrailerExpandButtonSettings(state);
  applyHoverCountdownSettings(state);

  if (!state.progress) {
    const progress = document.createElement('div');
    progress.className = 'jhs-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.style.display = 'none';

    const progressBar = document.createElement('div');
    progressBar.className = 'jhs-progress-bar';
    progress.appendChild(progressBar);
    positionedHost.appendChild(progress);

    state.progress = progress;
    state.progressBar = progressBar;
  }

  return state;
}

export function resetPreviewBackdrop(state: CardState | null | undefined): void {
  if (!state?.previewBackdrop) {
    return;
  }

  const style = state.previewBackdrop.style as CSSStyleDeclaration & {
    webkitBackdropFilter: string;
  };
  state.previewBackdrop.style.display = 'none';
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
  if (!state?.hoverCountdown || !state.hoverCountdownLabel) {
    return;
  }

  applyHoverCountdownSettings(state);
  const safeTotalMs = Math.max(1, totalMs);
  const clampedRemainingMs = Math.max(0, remainingMs);
  const progress = Math.max(0, Math.min(1, clampedRemainingMs / safeTotalMs));
  const secondsRemaining = Math.max(0, Math.ceil(clampedRemainingMs / 1000));

  state.hoverCountdown.style.display = 'block';
  state.hoverCountdown.style.setProperty('--progress', progress.toFixed(4));
  state.hoverCountdownLabel.textContent = String(secondsRemaining);
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
  if (!state?.unavailableMessage) {
    return;
  }

  state.unavailableMessage.textContent = message;
  state.unavailableMessage.style.display = 'block';
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
  if (!state?.previewBackdrop) {
    return;
  }

  const backdropStyles = getPreviewBackdropStyles();
  const shouldShow = !(backdropStyles.background === 'transparent' && backdropStyles.backdropFilter === 'none');
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
  if (!state?.progress || !state.progressBar) {
    return;
  }

  state.progress.style.display = '';
  state.progressBar.style.width = `${Math.round((percent || 0) * 100)}%`;
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
      restoreCard(card);
      card.removeAttribute(STATE_ATTR);
    }
  });
}
