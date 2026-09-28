import { config } from '../config';
import { PREVIEW_SOURCE_DIRECT_PLAY, PREVIEW_SOURCE_TRAILER } from '../constants';
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
  setTrailerMediaControlsVisible,
  setTrailerLayerVisible,
  syncTrailerMediaControls
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
import { markYouTubeTrailerUnavailable, markVideoTrailerUnavailable } from './trailer';
import { markDirectPlayUnavailable } from './directPlay';
import type { VideoPreview } from '../types/preview';
import type { CardState } from '../types/state';

export function updateTrailerAudioState(
  mediaElement: HTMLVideoElement | HTMLIFrameElement | null,
  forceMuted = false
): void {
  if (!(mediaElement instanceof HTMLVideoElement)) {
    return;
  }

  if (forceMuted) {
    mediaElement.volume = 0;
    mediaElement.muted = true;
    mediaElement.defaultMuted = true;
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

  const mediaElement = document.createElement(kind === 'iframe' ? 'iframe' : 'video') as
    HTMLVideoElement | HTMLIFrameElement;
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
  setTrailerMediaControlsVisible(state, false);
  resetPreviewBackdrop(state);
  state.currentTrailer = null;
  state.trailerPlaybackStartedAt = 0;

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
  videoElement.onerror = null;
  videoElement.onloadedmetadata = null;
  videoElement.ontimeupdate = null;
  videoElement.onplay = null;
  videoElement.onpause = null;
  videoElement.onvolumechange = null;
  videoElement.pause();
  videoElement.playbackRate = 1;
  videoElement.defaultPlaybackRate = 1;
  videoElement.loop = true;
  videoElement.removeAttribute('src');
  delete videoElement.dataset.jmpFallbackApplied;
  delete videoElement.dataset.jmpPreviewStartSeconds;
  videoElement.load();
}

export function applyTrailerPreview(
  card: HTMLElement,
  preview: VideoPreview | null | undefined,
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
  const hostRect = expandPortraitCardForPreview(card, state, trailer.aspectRatio) || rootHost.getBoundingClientRect();
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
  state.activePreviewSource = preview.source;
  hidePreviewFrame(state);
  resetPreviewBackdrop(state);
  applyPreviewBackdrop(state);

  if (
    trailer.kind === 'iframe' &&
    state.currentTrailer?.youtubeId &&
    state.currentTrailer.youtubeId !== trailer.youtubeId
  ) {
    clearTrailerMedia(state);
  }

  const mediaElement = ensureTrailerMediaElement(state, trailer.kind);
  if (!mediaElement) {
    return;
  }

  state.currentTrailer = trailer;
  applyMediaLayout(
    state.trailerLayer,
    mediaElement,
    hostRect,
    previewMode,
    sourceWidth,
    sourceHeight,
    rootBorderRadius
  );
  setTrailerLayerVisible(state, true);
  const isExpandableTrailer = preview.source === PREVIEW_SOURCE_TRAILER;
  const hasInlineMediaControls =
    trailer.kind === 'video' && (trailer.provider === 'local-trailer' || trailer.provider === 'direct-play');
  if ((isExpandableTrailer && config.trailerExpandButtonEnabled) || hasInlineMediaControls) {
    ensureTrailerActions(card, state);
  }
  setTrailerExpandVisible(state, isExpandableTrailer);
  setTrailerMediaControlsVisible(state, hasInlineMediaControls);
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
      ? buildYouTubeEmbedUrl(trailer.youtubeId, !canPlayTrailerAudio(), { controls: false, loop: false })
      : trailer.embedUrl;

    if (iframeUrl && mediaElement instanceof HTMLIFrameElement && mediaElement.src !== iframeUrl) {
      state.trailerMediaCleanup?.();
      state.trailerMediaCleanup = monitorYouTubeEmbed(mediaElement, {
        loop: true,
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
          /*
           * Looping is driven by the player API here, so without it the preview
           * plays once instead of repeating. Reloading the iframe with the
           * playlist based loop would restart playback mid preview, which is
           * worse than not looping for a short hover.
           */
          debugLog(
            'YouTube iframe API monitoring is unavailable, preview will not loop.',
            trailer.youtubeId || trailer.title
          );
        }
      });
      mediaElement.src = iframeUrl;
      state.trailerPlaybackStartedAt = Date.now();
    }
  } else if (mediaElement instanceof HTMLVideoElement) {
    const isDirectPlay = preview.source === PREVIEW_SOURCE_DIRECT_PLAY;
    const playbackRate = isDirectPlay ? Math.max(0.5, Math.min(2, Number(trailer.playbackRate) || 1.5)) : 1;
    const previewDurationSeconds = isDirectPlay ? Math.max(0, Number(trailer.previewDurationSeconds) || 0) : 0;

    mediaElement.loop = !isDirectPlay;
    mediaElement.defaultPlaybackRate = playbackRate;
    mediaElement.playbackRate = playbackRate;
    updateTrailerAudioState(mediaElement, isDirectPlay);
    mediaElement.onplay = () => syncTrailerMediaControls(state);
    mediaElement.onpause = () => syncTrailerMediaControls(state);
    mediaElement.onvolumechange = () => syncTrailerMediaControls(state);

    if (previewDurationSeconds > 0) {
      mediaElement.dataset.jmpPreviewStartSeconds = String(Math.max(0, Number(trailer.startSeconds) || 0));
      mediaElement.ontimeupdate = () => {
        const previewStartSeconds = Number(mediaElement.dataset.jmpPreviewStartSeconds);
        if (
          Number.isFinite(previewStartSeconds) &&
          mediaElement.currentTime - previewStartSeconds >= previewDurationSeconds
        ) {
          mediaElement.pause();
        }
      };
    } else {
      mediaElement.ontimeupdate = null;
      delete mediaElement.dataset.jmpPreviewStartSeconds;
    }

    const recoverFromVideoFailure = () => {
      debugLog('Recovering from failed video preview through the remaining source chain.', {
        itemId: preview.itemId,
        source: preview.source,
        provider: trailer.provider,
        mediaErrorCode: mediaElement.error?.code || null,
        mediaErrorMessage: mediaElement.error?.message || null,
        networkState: mediaElement.networkState,
        readyState: mediaElement.readyState,
        fallbackApplied: mediaElement.dataset.jmpFallbackApplied === 'true'
      });
      if (preview.source === PREVIEW_SOURCE_DIRECT_PLAY) {
        markDirectPlayUnavailable(preview.itemId);
      } else {
        markVideoTrailerUnavailable(preview.itemId, trailer);
      }
      state.lastPreviewKey = null;
      state.activePreviewSource = null;
      clearTrailerMedia(state);
      hideMetadataOverlay(state);
      options?.onUnavailable?.();
    };

    mediaElement.onerror = () => {
      if (trailer.fallbackSrc && mediaElement.dataset.jmpFallbackApplied !== 'true') {
        debugLog('Direct video playback failed. Trying the transcoded MP4 fallback.', {
          itemId: preview.itemId,
          source: preview.source,
          provider: trailer.provider,
          mediaErrorCode: mediaElement.error?.code || null,
          mediaErrorMessage: mediaElement.error?.message || null,
          networkState: mediaElement.networkState,
          readyState: mediaElement.readyState
        });
        mediaElement.dataset.jmpFallbackApplied = 'true';
        mediaElement.dataset.jmpPreviewStartSeconds = '0';
        mediaElement.src = trailer.fallbackSrc;
        mediaElement.load();
        mediaElement.defaultPlaybackRate = playbackRate;
        mediaElement.playbackRate = playbackRate;
        updateTrailerAudioState(mediaElement, isDirectPlay);
        const fallbackPromise = mediaElement.play();
        if (fallbackPromise && typeof fallbackPromise.catch === 'function') {
          fallbackPromise.catch((error) => {
            debugLog('Transcoded video autoplay failed.', {
              itemId: preview.itemId,
              source: preview.source,
              provider: trailer.provider,
              error
            });
          });
        }
        return;
      }

      debugLog('Video preview source failed.', {
        itemId: preview.itemId,
        source: preview.source,
        provider: trailer.provider
      });
      recoverFromVideoFailure();
    };

    mediaElement.onloadedmetadata = () => {
      mediaElement.defaultPlaybackRate = playbackRate;
      mediaElement.playbackRate = playbackRate;
      if (
        Number.isFinite(trailer.startSeconds) &&
        Number(trailer.startSeconds) > 0 &&
        mediaElement.dataset.jmpFallbackApplied !== 'true' &&
        Math.abs(mediaElement.currentTime - Number(trailer.startSeconds)) > 1
      ) {
        try {
          mediaElement.currentTime = Number(trailer.startSeconds);
        } catch {
          // Some direct streams are not seekable until more metadata is available.
        }
      }

      if (previewDurationSeconds > 0) {
        mediaElement.dataset.jmpPreviewStartSeconds = String(
          mediaElement.dataset.jmpFallbackApplied === 'true'
            ? Math.max(0, mediaElement.currentTime)
            : Math.max(0, Number(trailer.startSeconds) || mediaElement.currentTime)
        );
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
        debugLog('Video preview autoplay failed.', {
          itemId: preview.itemId,
          source: preview.source,
          provider: trailer.provider,
          error
        });
      });
    }
  }

  hideProgress(state);
}
