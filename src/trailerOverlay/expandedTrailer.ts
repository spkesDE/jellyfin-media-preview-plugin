import { EXPANDED_TRAILER_TRANSITION_MS } from '../constants';
import { getPreviewModeForCard } from '../cards/layout';
import { getOrCreateCardState } from '../cards/state';
import { restoreCard, setTrailerExpandVisible } from '../cards/lifecycle';
import { canPlayTrailerAudio } from '../preview/renderTrailer';
import { applyMediaLayout } from '../preview/mediaLayout';
import { buildYouTubeEmbedUrl } from './youtube';
import { runtimeState } from '../runtime';

export function ensureExpandedTrailerDom() {
  if (runtimeState.expandedTrailerDom) {
    return runtimeState.expandedTrailerDom;
  }

  const overlay = document.createElement('div');
  overlay.className = 'jhs-expanded-trailer-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'jhs-expanded-trailer-backdrop';

  const shell = document.createElement('div');
  shell.className = 'jhs-expanded-trailer-shell';

  const viewport = document.createElement('div');
  viewport.className = 'jhs-expanded-trailer-viewport';

  const mediaHost = document.createElement('div');
  mediaHost.className = 'jhs-expanded-trailer-media-host';
  viewport.appendChild(mediaHost);

  const ui = document.createElement('div');
  ui.className = 'jhs-expanded-trailer-ui';

  const title = document.createElement('div');
  title.className = 'jhs-expanded-trailer-title';
  title.textContent = '';

  const closeButton = document.createElement('button');
  closeButton.className = 'jhs-expanded-trailer-close';
  closeButton.type = 'button';
  closeButton.title = 'Close expanded trailer';
  closeButton.setAttribute('aria-label', 'Close expanded trailer');
  closeButton.innerHTML = '<span class="material-icons" aria-hidden="true">close</span>';

  ui.appendChild(title);
  ui.appendChild(closeButton);
  shell.appendChild(viewport);
  shell.appendChild(ui);
  overlay.appendChild(backdrop);
  overlay.appendChild(shell);
  document.body.appendChild(overlay);

  backdrop.addEventListener('click', () => {
    collapseExpandedTrailer();
  });
  viewport.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  mediaHost.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  closeButton.addEventListener('click', () => {
    collapseExpandedTrailer();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && runtimeState.expandedTrailerSession) {
      collapseExpandedTrailer();
    }
  });
  window.addEventListener('resize', () => {
    if (!runtimeState.expandedTrailerSession) {
      return;
    }

    const viewportRect = getExpandedTrailerViewportRect(runtimeState.expandedTrailerSession);
    applyExpandedViewportRect(viewport, viewportRect);
    syncExpandedTrailerMediaLayout(runtimeState.expandedTrailerSession);
  });

  runtimeState.expandedTrailerDom = {
    overlay,
    viewport,
    mediaHost,
    title
  };

  return runtimeState.expandedTrailerDom;
}

export function getExpandedTrailerViewportRect(session: NonNullable<typeof runtimeState.expandedTrailerSession>) {
  const trailer = session?.trailer || {};
  const aspectWidth = Math.max(1, trailer.aspectRatio?.width || 16);
  const aspectHeight = Math.max(1, trailer.aspectRatio?.height || 9);
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720;
  const safeWidth = Math.max(320, viewportWidth - 80);
  const safeHeight = Math.max(240, viewportHeight - 80);
  const scale = Math.min(safeWidth / aspectWidth, safeHeight / aspectHeight);
  const width = Math.round(aspectWidth * scale);
  const height = Math.round(aspectHeight * scale);

  return {
    left: Math.round((viewportWidth - width) / 2),
    top: Math.round((viewportHeight - height) / 2),
    width,
    height
  };
}

export function applyExpandedViewportRect(viewport: HTMLElement | null, rect: { left: number; top: number; width: number; height: number } | null): void {
  if (!viewport || !rect) {
    return;
  }

  viewport.style.left = `${rect.left}px`;
  viewport.style.top = `${rect.top}px`;
  viewport.style.width = `${rect.width}px`;
  viewport.style.height = `${rect.height}px`;
}

export function syncExpandedTrailerMediaLayout(session: NonNullable<typeof runtimeState.expandedTrailerSession>): void {
  if (!session || !runtimeState.expandedTrailerDom) {
    return;
  }

  const trailer = session.trailer || {};
  const previewMode = getPreviewModeForCard(session.card);
  const targetRect = getExpandedTrailerViewportRect(session);
  const mediaElement = session.expandedMedia || session.state.trailerMedia;
  if (!mediaElement) {
    return;
  }

  applyMediaLayout(
    runtimeState.expandedTrailerDom.mediaHost,
    mediaElement,
    targetRect,
    previewMode,
    Math.max(1, trailer.aspectRatio?.width || 16),
    Math.max(1, trailer.aspectRatio?.height || 9),
    '22px'
  );
}

export function getApproximateTrailerPlaybackSeconds(state: ReturnType<typeof getOrCreateCardState>): number {
  if (!state?.trailerPlaybackStartedAt) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - state.trailerPlaybackStartedAt) / 1000));
}

export function expandTrailer(card: HTMLElement): void {
  const state = getOrCreateCardState(card);
  if (!state.trailerMedia || !state.currentTrailer || !state.trailerLayer || state.trailerLayer.style.display === 'none') {
    return;
  }

  if (runtimeState.expandedTrailerSession && runtimeState.expandedTrailerSession.card === card) {
    return;
  }

  collapseExpandedTrailer({ immediate: true });

  const overlayState = ensureExpandedTrailerDom();
  const sourceRect = state.trailerLayer.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height) {
    return;
  }

  runtimeState.expandedTrailerSession = {
    card,
    state,
    trailer: state.currentTrailer,
    expandedMedia: null,
    expandedPlaybackStartedAt: 0,
    collapsedMedia: state.trailerMedia,
    sourceRect: {
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
      height: sourceRect.height
    }
  };

  state.pointerInside = true;
  overlayState.title.textContent = state.currentTrailer.title || 'Trailer';
  overlayState.overlay.style.display = 'block';
  overlayState.overlay.setAttribute('aria-hidden', 'false');
  applyExpandedViewportRect(overlayState.viewport, runtimeState.expandedTrailerSession.sourceRect);
  setTrailerExpandVisible(state, false);
  state.trailerLayer.style.visibility = 'hidden';

  if (state.trailerMediaKind === 'iframe' && state.currentTrailer.youtubeId) {
    const expandedMedia = document.createElement('iframe');
    const startSeconds = getApproximateTrailerPlaybackSeconds(state);
    expandedMedia.className = 'jhs-trailer-media jhs-interactive';
    expandedMedia.setAttribute('aria-hidden', 'true');
    expandedMedia.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    expandedMedia.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    expandedMedia.setAttribute('tabindex', '-1');
    expandedMedia.src = buildYouTubeEmbedUrl(state.currentTrailer.youtubeId, !canPlayTrailerAudio(), {
      controls: true,
      startSeconds
    }) || 'about:blank';
    runtimeState.expandedTrailerSession.expandedMedia = expandedMedia;
    runtimeState.expandedTrailerSession.expandedPlaybackStartedAt = Date.now() - (startSeconds * 1000);
    overlayState.mediaHost.appendChild(expandedMedia);
    if (state.trailerMedia instanceof HTMLIFrameElement) {
      state.trailerMedia.src = 'about:blank';
    }
  } else {
    overlayState.mediaHost.appendChild(state.trailerMedia);
    state.trailerMedia.classList.add('jhs-interactive');
    if (state.trailerMedia instanceof HTMLVideoElement) {
      state.trailerMedia.controls = true;
    }
  }

  window.requestAnimationFrame(() => {
    if (!runtimeState.expandedTrailerSession || runtimeState.expandedTrailerSession.card !== card) {
      return;
    }

    overlayState.overlay.classList.add('is-open');
    const targetRect = getExpandedTrailerViewportRect(runtimeState.expandedTrailerSession);
    applyExpandedViewportRect(overlayState.viewport, targetRect);
    syncExpandedTrailerMediaLayout(runtimeState.expandedTrailerSession);
  });
}

export function collapseExpandedTrailer(options?: { immediate?: boolean }): void {
  if (!runtimeState.expandedTrailerSession || !runtimeState.expandedTrailerDom) {
    return;
  }

  const session = runtimeState.expandedTrailerSession;
  const state = session.state;
  const overlayState = runtimeState.expandedTrailerDom;
  const immediate = !!options?.immediate;
  const targetRect = state.trailerLayer ? state.trailerLayer.getBoundingClientRect() : session.sourceRect;

  function finalizeCollapse(): void {
    runtimeState.expandedTrailerSession = null;
    overlayState.overlay.classList.remove('is-open');
    overlayState.overlay.style.display = 'none';
    overlayState.overlay.setAttribute('aria-hidden', 'true');
    overlayState.title.textContent = '';

    if (state.trailerLayer) {
      if (session.expandedMedia) {
        if (session.collapsedMedia && session.collapsedMedia !== session.expandedMedia && session.collapsedMedia.parentNode) {
          session.collapsedMedia.parentNode.removeChild(session.collapsedMedia);
        }

        state.trailerMedia = session.expandedMedia;
        state.trailerMediaKind = 'iframe';
        state.trailerPlaybackStartedAt = session.expandedPlaybackStartedAt || Date.now();
        state.trailerMedia.classList.remove('jhs-interactive');
        state.trailerLayer.appendChild(state.trailerMedia);
      } else if (state.trailerMedia) {
        if (state.trailerMediaKind === 'video' && state.trailerMedia instanceof HTMLVideoElement) {
          state.trailerMedia.controls = false;
          state.trailerMedia.classList.remove('jhs-interactive');
        }

        state.trailerLayer.appendChild(state.trailerMedia);
      }

      state.trailerLayer.style.visibility = 'visible';
    }

    if (state.currentTrailer && state.rootHost && state.trailerLayer && state.trailerMedia) {
      const hostRect = state.rootHost.getBoundingClientRect();
      applyMediaLayout(
        state.trailerLayer,
        state.trailerMedia,
        hostRect,
        getPreviewModeForCard(session.card),
        Math.max(1, state.currentTrailer.aspectRatio?.width || 16),
        Math.max(1, state.currentTrailer.aspectRatio?.height || 9),
        window.getComputedStyle(state.rootHost).borderRadius
      );
    }

    state.pointerInside = false;
    restoreCard(session.card);
  }

  if (immediate) {
    finalizeCollapse();
    return;
  }

  overlayState.overlay.classList.remove('is-open');
  if (targetRect && targetRect.width && targetRect.height) {
    applyExpandedViewportRect(overlayState.viewport, {
      left: targetRect.left,
      top: targetRect.top,
      width: targetRect.width,
      height: targetRect.height
    });
  }

  window.setTimeout(finalizeCollapse, EXPANDED_TRAILER_TRANSITION_MS);
}
