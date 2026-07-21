import { config } from '../config';
import { PREVIEW_SOURCE_TRAILER } from '../constants';
import { getPreviewModeForCard } from '../cards/layout';
import {
  applyPreviewBackdrop,
  ensurePreviewHost,
  ensureTrailerActions,
  ensureTrailerLayer,
  hidePreviewFrame,
  hideMetadataOverlay,
  hideProgress,
  resetPreviewBackdrop,
  setTrailerExpandVisible,
  setTrailerLayerVisible
} from '../cards/lifecycle';
import { getOrCreateCardState } from '../cards/state';
import { expandPortraitCardForPreview } from '../cards/widePreview';
import { debugLog } from '../core/logger';
import { runtimeState } from '../runtime';
import { applyMediaLayout } from './mediaLayout';
import {
  buildYouTubeEmbedUrl,
  monitorYouTubeEmbed,
  YOUTUBE_EMBED_UNAVAILABLE_ERROR_CODES
} from '../trailerOverlay/youtube';
import { collapseExpandedTrailer } from '../trailerOverlay/expandedTrailer';
import { markYouTubeTrailerUnavailable } from './trailer';
import type { TrailerPreview } from '../types/preview';
import type { CardState } from '../types/state';

export function updateTrailerAudioState(mediaElement: HTMLVideoElement | HTMLIFrameElement | null): void {
  if (!(mediaElement instanceof HTMLVideoElement)) {
    return;
  }

  const canUseAudio = canPlayTrailerAudio();

  mediaElement.volume = Math.max(0, Math.min(1, (Number(config.trailerVolumePercent) || 0) / 100));
  mediaElement.muted = !canUseAudio;
  mediaElement.defaultMuted = !canUseAudio;
}

export function canPlayTrailerAudio(): boolean {
  const browserActivation = window.navigator.userActivation?.hasBeenActive;
  return !!config.trailerAudioEnabled && (runtimeState.pageHasUserActivation || !!browserActivation);
}

export function ensureTrailerMediaElement(
  state: CardState,
  kind: 'iframe' | 'video'
): HTMLVideoElement | HTMLIFrameElement | null {
  if (!state.trailerLayer) {
    return null;
  }

  if (state.trailerMedia && state.trailerMediaKind === kind) {
    return state.trailerMedia;
  }

  if (state.trailerMedia) {
    const previousMedia = state.trailerMedia;
    state.trailerMediaCleanup?.();
    state.trailerMediaCleanup = null;
    if (previousMedia.parentNode) {
      previousMedia.parentNode.removeChild(previousMedia);
    }
  }

  const mediaElement = document.createElement(kind === 'iframe' ? 'iframe' : 'video') as HTMLVideoElement | HTMLIFrameElement;
  mediaElement.className = 'jmp-trailer-media';
  mediaElement.setAttribute('aria-hidden', 'true');

  if (kind === 'iframe') {
    mediaElement.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    mediaElement.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    mediaElement.setAttribute('tabindex', '-1');
  } else {
    const videoElement = mediaElement as HTMLVideoElement;
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.playsInline = true;
    videoElement.preload = 'metadata';
    videoElement.controls = false;
    updateTrailerAudioState(videoElement);
  }

  state.trailerLayer.appendChild(mediaElement);
  state.trailerMedia = mediaElement;
  state.trailerMediaKind = kind;
  return mediaElement;
}

export function clearTrailerMedia(state: CardState | null | undefined): void {
  if (!state) {
    return;
  }

  if (runtimeState.expandedTrailerSession && runtimeState.expandedTrailerSession.state === state) {
    collapseExpandedTrailer({ immediate: true });
  }

  setTrailerLayerVisible(state, false);
  setTrailerExpandVisible(state, false);
  resetPreviewBackdrop(state);
  state.currentTrailer = null;

  if (!state.trailerMedia) {
    return;
  }

  if (state.trailerMediaKind === 'iframe') {
    state.trailerMediaCleanup?.();
    state.trailerMediaCleanup = null;
    if (state.trailerMedia.parentNode) {
      state.trailerMedia.parentNode.removeChild(state.trailerMedia);
    }
    state.trailerMedia = null;
    state.trailerMediaKind = null;
    return;
  }

  const videoElement = state.trailerMedia as HTMLVideoElement;
  videoElement.pause();
  videoElement.removeAttribute('src');
  videoElement.load();
}

export function applyTrailerPreview(
  card: HTMLElement,
  preview: TrailerPreview | null | undefined,
  options?: { onUnavailable?: () => void }
): void {
  const state = getOrCreateCardState(card);
  if (!ensurePreviewHost(card, state) || !preview?.trailer || !ensureTrailerLayer(state)) {
    return;
  }

  const rootHost = state.rootHost;
  if (!rootHost || !state.trailerLayer) {
    return;
  }

  const trailer = preview.trailer;
  const hostRect = expandPortraitCardForPreview(card, state, trailer.aspectRatio)
    || rootHost.getBoundingClientRect();
  if (!hostRect.width || !hostRect.height) {
    return;
  }

  const sourceWidth = Math.max(1, trailer.aspectRatio?.width || 16);
  const sourceHeight = Math.max(1, trailer.aspectRatio?.height || 9);
  const previewMode = getPreviewModeForCard(card);
  const rootBorderRadius = window.getComputedStyle(rootHost).borderRadius;
  const previewKey = [
    trailer.kind,
    trailer.src || trailer.embedUrl || trailer.youtubeId,
    previewMode,
    Math.round(hostRect.width),
    Math.round(hostRect.height)
  ].join('|');

  if (state.lastPreviewKey === previewKey && state.trailerLayer.style.display !== 'none') {
    return;
  }

  state.lastPreviewKey = previewKey;
  state.previewActive = true;
  state.activePreviewSource = PREVIEW_SOURCE_TRAILER;
  hidePreviewFrame(state);
  resetPreviewBackdrop(state);
  applyPreviewBackdrop(state);

  if (
    trailer.kind === 'iframe'
    && state.currentTrailer?.youtubeId
    && state.currentTrailer.youtubeId !== trailer.youtubeId
  ) {
    clearTrailerMedia(state);
  }

  const mediaElement = ensureTrailerMediaElement(state, trailer.kind);
  if (!mediaElement) {
    return;
  }

  state.currentTrailer = trailer;
  applyMediaLayout(state.trailerLayer, mediaElement, hostRect, previewMode, sourceWidth, sourceHeight, rootBorderRadius);
  setTrailerLayerVisible(state, true);
  if (config.trailerExpandButtonEnabled) {
    ensureTrailerActions(card, state);
  }
  setTrailerExpandVisible(state, true);
  state.trailerLayer.style.background = 'transparent';
  mediaElement.style.background = 'transparent';
  state.trailerLayer.classList.toggle('jmp-debug-visible', !!config.debug);
  debugLog('Applying trailer preview.', {
    title: trailer.title || null,
    kind: trailer.kind,
    mode: previewMode,
    cropStrength: config.youTubeCropStrength,
    hostWidth: Math.round(hostRect.width),
    hostHeight: Math.round(hostRect.height),
    hostOffsetLeft: 0,
    hostOffsetTop: 0,
    layerWidth: state.trailerLayer.style.width,
    layerHeight: state.trailerLayer.style.height,
    layerLeft: state.trailerLayer.style.left,
    layerTop: state.trailerLayer.style.top
  });

  if (trailer.kind === 'iframe') {
    const iframeUrl = trailer.youtubeId
      ? buildYouTubeEmbedUrl(trailer.youtubeId, !canPlayTrailerAudio(), { controls: false })
      : trailer.embedUrl;

    if (iframeUrl && mediaElement instanceof HTMLIFrameElement && mediaElement.src !== iframeUrl) {
      state.trailerMediaCleanup?.();
      state.trailerMediaCleanup = monitorYouTubeEmbed(mediaElement, {
        onError: (errorCode) => {
          if (!YOUTUBE_EMBED_UNAVAILABLE_ERROR_CODES.has(errorCode)) {
            return;
          }

          window.setTimeout(() => {
            if (state.trailerMedia !== mediaElement || state.currentTrailer !== trailer) {
              return;
            }

            debugLog('YouTube trailer cannot be played in an embedded player.', {
              title: trailer.title || null,
              youtubeId: trailer.youtubeId || null,
              errorCode
            });
            markYouTubeTrailerUnavailable(trailer.youtubeId, preview.itemId, errorCode);
            state.lastPreviewKey = null;
            state.activePreviewSource = null;
            clearTrailerMedia(state);
            hideMetadataOverlay(state);
            options?.onUnavailable?.();
          }, 0);
        },
        onMonitorUnavailable: () => {
          debugLog('YouTube iframe API monitoring is unavailable.', trailer.youtubeId || trailer.title);
        }
      });
      mediaElement.src = iframeUrl;
      state.trailerPlaybackStartedAt = Date.now();
    }
  } else if (mediaElement instanceof HTMLVideoElement) {
    updateTrailerAudioState(mediaElement);

    mediaElement.onerror = () => {
      if (trailer.fallbackSrc && mediaElement.dataset.jmpFallbackApplied !== 'true') {
        debugLog('Local trailer direct playback failed. Falling back to transcoded MP4.', trailer.title || trailer.src);
        mediaElement.dataset.jmpFallbackApplied = 'true';
        mediaElement.src = trailer.fallbackSrc;
        mediaElement.load();
        updateTrailerAudioState(mediaElement);
        const fallbackPromise = mediaElement.play();
        if (fallbackPromise && typeof fallbackPromise.catch === 'function') {
          fallbackPromise.catch((error) => {
            debugLog('Transcoded trailer autoplay failed.', trailer.title || trailer.fallbackSrc, error);
          });
        }
      }
    };

    if (trailer.src && mediaElement.src !== trailer.src) {
      mediaElement.dataset.jmpFallbackApplied = 'false';
      mediaElement.src = trailer.src;
      mediaElement.load();
      state.trailerPlaybackStartedAt = Date.now();
    }

    const playPromise = mediaElement.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((error) => {
        debugLog('Trailer autoplay failed.', trailer.title || trailer.src, error);
      });
    }
  }

  hideProgress(state);
}
