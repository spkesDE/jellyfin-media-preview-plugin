import {
  ADMIN_NAV_LINK_ATTR,
  PREVIEW_TRANSITION_CROSSFADE,
  PREVIEW_TRANSITION_OFF,
  STATE_ATTR,
  STYLE_ID
} from '../constants';
import { config } from '../config';
import { getPreviewBackdropStyles } from './layout';
import { getImageRenderHost } from './discovery';
import { getOrCreateCardState } from './state';
import { restorePortraitCardWidth } from './widePreview';
import { clearTrailerMedia } from '../preview/renderTrailer';
import { cancelScheduledTrickplayPreload, disconnectTrickplayPreloadObserver } from '../preview/preload';
import { expandTrailer } from '../trailerOverlay/expandedTrailer';
import { clearAutoScrub } from '../interaction/autoScrub';
import { runtimeState } from '../runtime';
import mediaPreviewGlobalStyles from '../styles/mediaPreviewGlobal.css';
import mediaPreviewHoverStyles from '../styles/mediaPreviewHover.css';
import mediaPreviewMetadataStyles from '../styles/mediaPreviewMetadata.css';
import mediaPreviewTrailerStyles from '../styles/mediaPreviewTrailer.css';
import mediaPreviewExpandedTrailerStyles from '../styles/mediaPreviewExpandedTrailer.css';
import type { CardState } from '../types/state';

const mediaPreviewStyles = [
  mediaPreviewGlobalStyles,
  mediaPreviewHoverStyles,
  mediaPreviewMetadataStyles,
  mediaPreviewTrailerStyles,
  mediaPreviewExpandedTrailerStyles
].join('\n');

function restoreManagedHostStyles(state: CardState): void {
  if (!state.rootHost) {
    state.managedHostPosition = null;
    state.managedHostOverflow = null;
    return;
  }

  if (state.managedHostPosition !== null) {
    state.rootHost.style.position = state.managedHostPosition;
    state.managedHostPosition = null;
  }

  if (state.managedHostOverflow !== null) {
    state.rootHost.style.overflow = state.managedHostOverflow;
    state.managedHostOverflow = null;
  }
}

function removeManagedNode<T extends HTMLElement>(state: CardState, key: keyof CardState): T | null {
  const node = state[key];
  if (!(node instanceof HTMLElement)) {
    return null;
  }

  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }

  return node as T;
}

export function getPreviewTransitionDurationMs(): number {
  return Math.max(0, Number(config.previewTransitionDurationMs) || 0);
}

export function hasPreviewTransition(): boolean {
  return config.previewTransitionMode !== PREVIEW_TRANSITION_OFF && getPreviewTransitionDurationMs() > 0;
}

export function isCrossfadePreviewTransition(): boolean {
  return config.previewTransitionMode === PREVIEW_TRANSITION_CROSSFADE && hasPreviewTransition();
}

function applyTransitionStyle(element: HTMLElement): void {
  element.style.transition = hasPreviewTransition()
    ? `opacity ${getPreviewTransitionDurationMs()}ms ease`
    : 'none';
}

function clearPreviewTransitionTimer(state: CardState | null | undefined): void {
  if (state?.previewTransitionTimer) {
    window.clearTimeout(state.previewTransitionTimer);
    state.previewTransitionTimer = null;
  }
}

function clearTrailerTransitionTimer(state: CardState | null | undefined): void {
  if (state?.trailerTransitionTimer) {
    window.clearTimeout(state.trailerTransitionTimer);
    state.trailerTransitionTimer = null;
  }
}

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

  if (state.rootHost && state.rootHost !== imageHost) {
    restoreManagedHostStyles(state);
  }

  const positionedHost = imageHost;
  if (window.getComputedStyle(positionedHost).position === 'static') {
    if (state.rootHost !== positionedHost || state.managedHostPosition === null) {
      state.managedHostPosition = positionedHost.style.position;
    }
    positionedHost.style.position = 'relative';
  }
  if (window.getComputedStyle(positionedHost).overflow !== 'hidden') {
    if (state.rootHost !== positionedHost || state.managedHostOverflow === null) {
      state.managedHostOverflow = positionedHost.style.overflow;
    }
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
    applyTransitionStyle(previewFrame);
    state.rootHost.appendChild(previewFrame);
    state.previewFrame = previewFrame;
  }

  applyTransitionStyle(state.previewFrame);
  return state.previewFrame;
}

export function ensurePreviewFrameSecondary(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.previewFrameSecondary) {
    const previewFrame = document.createElement('div');
    previewFrame.className = 'jmp-preview-layer';
    previewFrame.setAttribute('aria-hidden', 'true');
    previewFrame.style.display = 'none';
    applyTransitionStyle(previewFrame);
    state.rootHost.appendChild(previewFrame);
    state.previewFrameSecondary = previewFrame;
  }

  applyTransitionStyle(state.previewFrameSecondary);
  return state.previewFrameSecondary;
}

export function getActivePreviewFrame(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state) {
    return null;
  }

  return state.activePreviewFrameSlot === 'secondary'
    ? state.previewFrameSecondary || state.previewFrame
    : state.previewFrame || state.previewFrameSecondary;
}

export function getInactivePreviewFrame(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state) {
    return null;
  }

  return state.activePreviewFrameSlot === 'secondary'
    ? ensurePreviewFrame(state)
    : ensurePreviewFrameSecondary(state);
}

export function setActivePreviewFrameSlot(state: CardState | null | undefined, slot: 'primary' | 'secondary'): void {
  if (!state) {
    return;
  }

  state.activePreviewFrameSlot = slot;
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

export function ensureMetadataOverlay(state: CardState | null | undefined): HTMLDivElement | null {
  if (!state?.rootHost) {
    return null;
  }

  if (!state.metadataOverlay) {
    const metadataOverlay = document.createElement('div');
    metadataOverlay.className = 'jmp-metadata-overlay';
    metadataOverlay.setAttribute('aria-hidden', 'true');
    metadataOverlay.style.display = 'none';

    const title = document.createElement('div');
    title.className = 'jmp-metadata-title';

    const meta = document.createElement('div');
    meta.className = 'jmp-metadata-meta';

    metadataOverlay.appendChild(title);
    metadataOverlay.appendChild(meta);
    state.rootHost.appendChild(metadataOverlay);

    state.metadataOverlay = metadataOverlay;
    state.metadataOverlayTitle = title;
    state.metadataOverlayMeta = meta;
  }

  applyMetadataOverlaySettings(state);
  return state.metadataOverlay;
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
  if (!config.hoverCountdownEnabled) {
    return;
  }

  const hoverCountdown = ensureHoverCountdown(state);
  const hoverCountdownLabel = state?.hoverCountdownLabel;
  if (!hoverCountdown || !hoverCountdownLabel) {
    return;
  }

  applyHoverCountdownSettings(state);
  hoverCountdown.classList.remove('is-loading');
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
  state.hoverCountdown.classList.remove('is-loading');
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

export function showLoadingIndicator(state: CardState | null | undefined): void {
  if (!config.trickplayLoadingIndicatorEnabled) {
    return;
  }

  const hoverCountdown = ensureHoverCountdown(state);
  if (!hoverCountdown || !state?.hoverCountdownLabel) {
    return;
  }

  applyHoverCountdownSettings(state);
  hoverCountdown.classList.add('is-loading');
  hoverCountdown.style.display = 'block';
  hoverCountdown.style.setProperty('--progress', '1');
  state.hoverCountdownLabel.textContent = '';
}

export function hideLoadingIndicator(state: CardState | null | undefined): void {
  if (!state?.hoverCountdown?.classList.contains('is-loading')) {
    return;
  }

  state.hoverCountdown.classList.remove('is-loading');
  state.hoverCountdown.style.display = 'none';
  state.hoverCountdown.style.setProperty('--progress', '1');
  if (state.hoverCountdownLabel) {
    state.hoverCountdownLabel.textContent = '1';
  }
}

export function setTrailerExpandVisible(state: CardState | null | undefined, isVisible: boolean): void {
  if (!state?.trailerActions) {
    return;
  }

  applyTrailerExpandButtonSettings(state);
  state.trailerActions.style.display = isVisible && config.trailerExpandButtonEnabled ? 'block' : 'none';
}

export function applyMetadataOverlaySettings(state: CardState | null | undefined): void {
  if (!state?.metadataOverlay) {
    return;
  }

  state.metadataOverlay.classList.remove('pos-top-left', 'pos-top-right', 'pos-bottom-left', 'pos-bottom-right');
  state.metadataOverlay.classList.add(`pos-${config.metadataOverlayPosition}`);
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

export function setTrailerLayerVisible(
  state: CardState | null | undefined,
  isVisible: boolean,
  options?: { immediate?: boolean }
): void {
  if (!state?.trailerLayer) {
    return;
  }

  const immediate = options?.immediate === true;
  clearTrailerTransitionTimer(state);
  applyTransitionStyle(state.trailerLayer);

  if (!isVisible) {
    if (immediate || !hasPreviewTransition()) {
      state.trailerLayer.style.display = 'none';
      state.trailerLayer.style.visibility = 'hidden';
      state.trailerLayer.style.opacity = '0';
      return;
    }

    state.trailerLayer.style.visibility = 'hidden';
    state.trailerLayer.style.opacity = '0';
    state.trailerTransitionTimer = window.setTimeout(() => {
      if (!state.trailerLayer) {
        return;
      }

      state.trailerLayer.style.display = 'none';
      state.trailerTransitionTimer = null;
    }, getPreviewTransitionDurationMs());
    return;
  }

  state.trailerLayer.style.display = 'block';
  state.trailerLayer.style.visibility = 'visible';
  if (immediate || !hasPreviewTransition()) {
    state.trailerLayer.style.opacity = '1';
    return;
  }

  state.trailerLayer.style.opacity = '0';
  window.requestAnimationFrame(() => {
    if (!state.trailerLayer) {
      return;
    }

    state.trailerLayer.style.opacity = '1';
  });
}

export function showPreviewFrameLayer(
  state: CardState | null | undefined,
  frame: HTMLDivElement | null | undefined,
  options?: { immediate?: boolean }
): void {
  if (!state || !frame) {
    return;
  }

  const immediate = options?.immediate === true;
  clearPreviewTransitionTimer(state);
  applyTransitionStyle(frame);
  frame.style.display = '';
  frame.style.visibility = 'visible';
  if (immediate || !hasPreviewTransition()) {
    frame.style.opacity = '1';
    return;
  }

  frame.style.opacity = '0';
  window.requestAnimationFrame(() => {
    frame.style.opacity = '1';
  });
}

export function crossfadePreviewFrameLayers(
  state: CardState | null | undefined,
  currentFrame: HTMLDivElement | null | undefined,
  nextFrame: HTMLDivElement | null | undefined
): void {
  if (!state || !currentFrame || !nextFrame) {
    return;
  }

  clearPreviewTransitionTimer(state);
  if (!isCrossfadePreviewTransition()) {
    currentFrame.style.display = 'none';
    currentFrame.style.visibility = 'hidden';
    currentFrame.style.opacity = '0';
    currentFrame.style.backgroundImage = '';
    showPreviewFrameLayer(state, nextFrame, { immediate: false });
    return;
  }

  applyTransitionStyle(currentFrame);
  applyTransitionStyle(nextFrame);
  nextFrame.style.display = '';
  nextFrame.style.visibility = 'visible';
  nextFrame.style.opacity = '0';
  currentFrame.style.display = '';
  currentFrame.style.visibility = 'visible';
  currentFrame.style.opacity = '1';
  window.requestAnimationFrame(() => {
    currentFrame.style.opacity = '0';
    nextFrame.style.opacity = '1';
  });

  state.previewTransitionTimer = window.setTimeout(() => {
    currentFrame.style.display = 'none';
    currentFrame.style.visibility = 'hidden';
    currentFrame.style.opacity = '0';
    currentFrame.style.backgroundImage = '';
    state.previewTransitionTimer = null;
  }, getPreviewTransitionDurationMs());
}

export function hidePreviewFrame(
  state: CardState | null | undefined,
  options?: { immediate?: boolean }
): void {
  if (!state?.previewFrame && !state?.previewFrameSecondary) {
    return;
  }

  const immediate = options?.immediate === true;
  clearPreviewTransitionTimer(state);
  const frames = [state.previewFrame, state.previewFrameSecondary].filter(Boolean) as HTMLDivElement[];
  frames.forEach((frame) => {
    applyTransitionStyle(frame);
  });

  if (immediate || !hasPreviewTransition()) {
    frames.forEach((frame) => {
      frame.style.display = 'none';
      frame.style.visibility = 'hidden';
      frame.style.opacity = '0';
      frame.style.backgroundImage = '';
    });
    state.activePreviewFrameSlot = 'primary';
    return;
  }

  frames.forEach((frame) => {
    if (frame.style.display !== 'none') {
      frame.style.visibility = 'hidden';
      frame.style.opacity = '0';
    }
  });

  state.previewTransitionTimer = window.setTimeout(() => {
    frames.forEach((frame) => {
      frame.style.display = 'none';
      frame.style.backgroundImage = '';
    });
    state.activePreviewFrameSlot = 'primary';
    state.previewTransitionTimer = null;
  }, getPreviewTransitionDurationMs());
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

export function showMetadataOverlay(
  state: CardState | null | undefined,
  title: string | null | undefined,
  meta: string | null | undefined
): void {
  const overlay = ensureMetadataOverlay(state);
  if (!overlay || !state?.metadataOverlayTitle || !state.metadataOverlayMeta) {
    return;
  }

  applyMetadataOverlaySettings(state);
  state.metadataOverlayTitle.textContent = title || '';
  state.metadataOverlayMeta.textContent = meta || '';
  state.metadataOverlayTitle.style.display = title ? 'block' : 'none';
  state.metadataOverlayMeta.style.display = meta ? 'block' : 'none';
  overlay.style.display = 'flex';
}

export function hideMetadataOverlay(state: CardState | null | undefined): void {
  if (!state?.metadataOverlay || !state.metadataOverlayTitle || !state.metadataOverlayMeta) {
    return;
  }

  state.metadataOverlay.style.display = 'none';
  state.metadataOverlayTitle.textContent = '';
  state.metadataOverlayMeta.textContent = '';
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
  cancelScheduledTrickplayPreload(card);
  clearAutoScrub(state);
  clearPreviewTransitionTimer(state);
  clearTrailerTransitionTimer(state);
  restorePortraitCardWidth(state);
  state.latestRequestToken += 1;
  state.hoverIntentAnchorX = null;
  state.hoverIntentAnchorY = null;
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
  hideLoadingIndicator(state);
  hideMetadataOverlay(state);

  if (config.restoreOnLeave) {
    hidePreviewFrame(state);
    clearTrailerMedia(state);
  }

  resetPreviewBackdrop(state);
  hideProgress(state);
}

export function destroyCardBindings(): void {
  const style = document.getElementById(STYLE_ID);
  if (style?.parentNode) {
    style.parentNode.removeChild(style);
  }

  document.querySelectorAll(`[${ADMIN_NAV_LINK_ATTR}="true"]`).forEach((entry) => {
    entry.remove();
  });

  disconnectTrickplayPreloadObserver();

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
      restorePortraitCardWidth(state, true);
      removeManagedNode<HTMLDivElement>(state, 'previewBackdrop');
      state.previewBackdrop = null;
      removeManagedNode<HTMLDivElement>(state, 'previewFrame');
      state.previewFrame = null;
      removeManagedNode<HTMLDivElement>(state, 'previewFrameSecondary');
      state.previewFrameSecondary = null;
      removeManagedNode<HTMLDivElement>(state, 'hoverCountdown');
      state.hoverCountdown = null;
      state.hoverCountdownLabel = null;
      removeManagedNode<HTMLDivElement>(state, 'unavailableMessage');
      state.unavailableMessage = null;
      removeManagedNode<HTMLDivElement>(state, 'trailerLayer');
      state.trailerLayer = null;
      state.trailerMedia = null;
      state.trailerMediaKind = null;
      removeManagedNode<HTMLDivElement>(state, 'trailerActions');
      state.trailerActions = null;
      state.trailerExpandButton = null;
      removeManagedNode<HTMLDivElement>(state, 'metadataOverlay');
      state.metadataOverlay = null;
      state.metadataOverlayTitle = null;
      state.metadataOverlayMeta = null;
      removeManagedNode<HTMLDivElement>(state, 'progress');
      state.progress = null;
      state.progressBar = null;
      restoreManagedHostStyles(state);
      state.rootHost = null;
      card.removeAttribute(STATE_ATTR);
    }
  });
}
