import { config } from '../config';
import { getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { t } from '../core/i18n';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import { isDataSaverActive, prefersReducedMotion } from '../core/userEnvironment';
import { getDirectPlayPreview } from '../preview/directPlay';
import { canPlayTrailerAudio } from '../preview/renderTrailer';
import { getTrailerPreview, markVideoTrailerUnavailable, markYouTubeTrailerUnavailable } from '../preview/trailer';
import { releaseVideoSource, setVideoSource } from '../preview/transcodeSessions';
import {
  YOUTUBE_EMBED_UNAVAILABLE_ERROR_CODES,
  buildYouTubeEmbedUrl,
  monitorYouTubeEmbed,
  type YouTubeEmbedMonitor
} from '../trailerOverlay/youtube';
import type { VideoPreview } from '../types/preview';
import { rememberUserAudioChange } from '../userPreferences/api';

/**
 * Plays a preview in the backdrop of an item's detail page, the way streaming apps do.
 *
 * The detail page markup belongs to Jellyfin Web and changes between versions, so every
 * selector lives in this file and the feature quietly does nothing when they stop matching.
 */

const BACKDROP_SELECTORS = ['.itemBackdrop', '.detailImageContainer .itemBackdrop'];
const ROOT_CLASS = 'jmp-detail-preview';
const FIND_BACKDROP_ATTEMPTS = 20;
const FIND_BACKDROP_INTERVAL_MS = 250;
const VISIBLE_RATIO = 0.25;

const MUTED_ICON =
  'M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.21.05-.42.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.9 8.9 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25A6.92 6.92 0 0 1 14 18.7v2.06a8.9 8.9 0 0 0 3.69-1.8L19.73 21 21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z';
const UNMUTED_ICON =
  'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.48 4.48 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z';

interface MediaController {
  play(): void;
  pause(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  cleanup(): void;
}

interface DetailSession {
  itemId: string;
  generation: number;
  backdrop: HTMLElement | null;
  root: HTMLDivElement | null;
  controller: MediaController | null;
  observer: IntersectionObserver | null;
  timers: number[];
  inView: boolean;
}

let generation = 0;
let session: DetailSession | null = null;
let visibilityHandler: (() => void) | null = null;

/** The item id when the current route is an item detail page, otherwise null. */
export function getDetailItemId(href: string = window.location.href): string | null {
  const hashIndex = href.indexOf('#');
  const route = hashIndex >= 0 ? href.slice(hashIndex + 1) : href;
  // Matches "/details?id=…" and the older "!/details?id=…".
  const path = route.split('?')[0].replace(/^!/, '');
  if (!/(^|\/)details$/.test(path)) {
    return null;
  }

  const query = route.includes('?') ? route.slice(route.indexOf('?') + 1) : '';
  const id = new URLSearchParams(query).get('id');
  return id && /^[0-9a-f-]{32,36}$/i.test(id) ? id : null;
}

function isElementShown(element: HTMLElement): boolean {
  if (element.closest('.hide')) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findBackdrop(): HTMLElement | null {
  for (const selector of BACKDROP_SELECTORS) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(isElementShown);
    if (candidates.length) {
      // Jellyfin keeps earlier pages in the DOM; the newest one is the visible page.
      return candidates[candidates.length - 1];
    }
  }
  return null;
}

function readUserSetting(name: string): string | null {
  const userId = getCurrentUserId(getGlobalApiClient());
  if (!userId) {
    return null;
  }
  try {
    return window.localStorage.getItem(`${userId}-${name}`);
  } catch {
    return null;
  }
}

/** Jellyfin's own theme video wins when the user turned theme videos on and the item has one. */
async function hasActiveThemeVideo(itemId: string): Promise<boolean> {
  if (readUserSetting('enableThemeVideos') !== 'true') {
    return false;
  }

  const userId = getCurrentUserId(getGlobalApiClient());
  try {
    const themeMedia = await requestJson<{ ThemeVideosResult?: { TotalRecordCount?: number } }>(
      `Items/${encodeURIComponent(itemId)}/ThemeMedia`,
      { userId, inheritFromParent: true }
    );
    return (themeMedia?.ThemeVideosResult?.TotalRecordCount || 0) > 0;
  } catch {
    return false;
  }
}

function themeSongsEnabled(): boolean {
  return readUserSetting('enableThemeSongs') === 'true';
}

function getSourceChain(): Array<'trailer' | 'direct-play'> {
  switch (config.detailPreviewSource) {
    case 'trailer':
      return ['trailer'];
    case 'direct-play':
      return ['direct-play'];
    case 'prefer-direct-play':
      return ['direct-play', 'trailer'];
    default:
      return ['trailer', 'direct-play'];
  }
}

async function resolvePreview(itemId: string): Promise<VideoPreview | null> {
  for (const source of getSourceChain()) {
    const preview = source === 'trailer' ? await getTrailerPreview(itemId) : await getDirectPlayPreview(itemId);
    if (preview) {
      return preview;
    }
  }
  return null;
}

function createMuteButton(controller: MediaController): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${ROOT_CLASS}-mute`;
  button.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path></path></svg>';
  const sync = () => {
    const muted = controller.isMuted();
    button.title = muted ? t('unmutePreview') : t('mutePreview');
    button.setAttribute('aria-label', button.title);
    button.querySelector('path')?.setAttribute('d', muted ? MUTED_ICON : UNMUTED_ICON);
  };
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const muted = !controller.isMuted();
    controller.setMuted(muted);
    rememberUserAudioChange(muted, Number(config.trailerVolumePercent) || 0);
    sync();
  });
  sync();
  return button;
}

function mountVideo(
  root: HTMLDivElement,
  preview: VideoPreview,
  muted: boolean,
  onFailure: () => void
): MediaController {
  const trailer = preview.trailer;
  const video = document.createElement('video');
  video.className = `${ROOT_CLASS}-media`;
  video.playsInline = true;
  video.autoplay = true;
  video.muted = muted;
  video.defaultMuted = muted;
  video.volume = Math.max(0, Math.min(1, (Number(config.trailerVolumePercent) || 0) / 100));
  video.setAttribute('aria-hidden', 'true');

  const isDirectPlay = preview.source === 'direct-play';
  const startSeconds = Math.max(0, Number(trailer.startSeconds) || 0);
  const durationSeconds = isDirectPlay ? Math.max(0, Number(trailer.previewDurationSeconds) || 0) : 0;
  video.loop = !isDirectPlay;
  let usedFallback = false;
  let windowStart = startSeconds;

  video.addEventListener('loadedmetadata', () => {
    if (!usedFallback && startSeconds > 0) {
      try {
        video.currentTime = startSeconds;
      } catch {
        // Not seekable yet; the preview simply starts from the beginning.
      }
    }
    windowStart = usedFallback ? video.currentTime : startSeconds;
  });
  video.addEventListener('playing', () => root.classList.add('is-playing'));
  video.addEventListener('timeupdate', () => {
    // Direct Play loops inside its preview window instead of running into the rest of the item.
    if (durationSeconds > 0 && video.currentTime - windowStart >= durationSeconds) {
      video.currentTime = windowStart;
    }
  });
  video.addEventListener('error', () => {
    if (trailer.fallbackSrc && !usedFallback) {
      usedFallback = true;
      setVideoSource(video, trailer.fallbackSrc);
      video.load();
      void video.play().catch(() => undefined);
      return;
    }
    if (!isDirectPlay) {
      markVideoTrailerUnavailable(preview.itemId, trailer);
    }
    onFailure();
  });

  if (trailer.src) {
    setVideoSource(video, trailer.src);
  }
  root.prepend(video);
  void video.play().catch(() => undefined);

  return {
    play: () => void video.play().catch(() => undefined),
    pause: () => video.pause(),
    setMuted: (value) => {
      video.muted = value;
    },
    isMuted: () => video.muted,
    cleanup: () => {
      video.pause();
      releaseVideoSource(video);
      video.removeAttribute('src');
      video.load();
      video.remove();
    }
  };
}

function mountYouTube(
  root: HTMLDivElement,
  preview: VideoPreview,
  muted: boolean,
  onFailure: () => void
): MediaController | null {
  const embedUrl = buildYouTubeEmbedUrl(preview.trailer.youtubeId, true, { loop: true });
  if (!embedUrl) {
    return null;
  }

  const iframe = document.createElement('iframe');
  iframe.className = `${ROOT_CLASS}-media ${ROOT_CLASS}-youtube`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  // Jellyfin Web sends no referrer by default; YouTube then refuses the embed (error 153).
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.src = embedUrl;
  let isMuted = muted;
  const monitor: YouTubeEmbedMonitor = monitorYouTubeEmbed(iframe, {
    loop: true,
    // The embed starts muted (autoplay rules); the monitor unmutes once the player is ready.
    initialMuted: muted,
    initialVolume: Math.max(0, Math.min(1, (Number(config.trailerVolumePercent) || 0) / 100)),
    onError: (errorCode) => {
      if (YOUTUBE_EMBED_UNAVAILABLE_ERROR_CODES.has(errorCode)) {
        markYouTubeTrailerUnavailable(preview.trailer.youtubeId, preview.itemId, errorCode);
      }
      onFailure();
    },
    onPlaybackStateChange: () => {
      if (!monitor.isPaused()) {
        root.classList.add('is-playing');
      }
    }
  });
  root.prepend(iframe);

  return {
    play: () => monitor.play(),
    pause: () => monitor.pause(),
    setMuted: (value) => {
      isMuted = value;
      monitor.setMuted(value);
    },
    isMuted: () => isMuted,
    cleanup: () => {
      monitor.cleanup();
      iframe.src = 'about:blank';
      iframe.remove();
    }
  };
}

function clearTimers(current: DetailSession): void {
  current.timers.forEach((timer) => window.clearTimeout(timer));
  current.timers = [];
}

/** Removes the running detail preview, if any, and lets Jellyfin's backdrop show again. */
export function stopDetailPreview(): void {
  const current = session;
  session = null;
  if (!current) {
    return;
  }

  clearTimers(current);
  current.observer?.disconnect();
  current.controller?.cleanup();
  current.root?.remove();
  current.backdrop?.classList.remove(`${ROOT_CLASS}-host`);
}

function updatePlayback(current: DetailSession): void {
  if (!current.controller) {
    return;
  }
  if (current.inView && document.visibilityState === 'visible') {
    current.controller.play();
  } else {
    current.controller.pause();
  }
}

async function startForItem(current: DetailSession): Promise<void> {
  const isCurrent = () => session === current && current.generation === generation;

  if (await hasActiveThemeVideo(current.itemId)) {
    debugLog('Detail preview skipped: Jellyfin plays this item’s theme video.', { itemId: current.itemId });
    return;
  }

  const preview = await resolvePreview(current.itemId);
  if (!isCurrent() || !preview?.trailer) {
    debugLog('Detail preview has no video source.', { itemId: current.itemId });
    return;
  }

  const backdrop = current.backdrop;
  if (!backdrop?.isConnected) {
    return;
  }

  const root = document.createElement('div');
  root.className = ROOT_CLASS;
  // Theme songs already play on this page; a second soundtrack on top would clash.
  const muted = themeSongsEnabled() || !canPlayTrailerAudio();
  const onFailure = () => {
    if (isCurrent()) {
      stopDetailPreview();
    }
  };
  const controller =
    preview.trailer.kind === 'iframe'
      ? mountYouTube(root, preview, muted, onFailure)
      : mountVideo(root, preview, muted, onFailure);
  if (!controller) {
    return;
  }

  root.appendChild(createMuteButton(controller));
  backdrop.classList.add(`${ROOT_CLASS}-host`);
  backdrop.appendChild(root);
  current.root = root;
  current.controller = controller;

  if (typeof IntersectionObserver === 'function') {
    current.observer = new IntersectionObserver(
      (entries) => {
        current.inView = entries.some((entry) => entry.intersectionRatio >= VISIBLE_RATIO);
        updatePlayback(current);
      },
      { threshold: [0, VISIBLE_RATIO, 1] }
    );
    current.observer.observe(backdrop);
  }
  debugLog('Detail preview started.', { itemId: current.itemId, source: preview.source });
}

function waitForBackdrop(current: DetailSession, attempt = 0): void {
  if (session !== current) {
    return;
  }

  const backdrop = findBackdrop();
  if (!backdrop) {
    if (attempt < FIND_BACKDROP_ATTEMPTS) {
      current.timers.push(window.setTimeout(() => waitForBackdrop(current, attempt + 1), FIND_BACKDROP_INTERVAL_MS));
    } else {
      debugLog('Detail preview skipped: no backdrop element was found on this page.', { itemId: current.itemId });
    }
    return;
  }

  current.backdrop = backdrop;
  const delayMs = Math.max(0, Number(config.detailPreviewDelayMs) || 0);
  current.timers.push(
    window.setTimeout(() => {
      void startForItem(current).catch((error: unknown) => {
        debugLog('Detail preview failed.', { itemId: current.itemId, error });
      });
    }, delayMs)
  );
}

function isDetailPreviewAllowed(): boolean {
  return (
    config.enabled &&
    config.detailPreviewEnabled === true &&
    config.userPreviewEnabled !== false &&
    // A video starting by itself is motion the viewer asked to avoid, and it costs data.
    !prefersReducedMotion() &&
    !isDataSaverActive()
  );
}

/** Called on every route change: starts, keeps or stops the detail page preview. */
export function syncDetailPreview(): void {
  const itemId = isDetailPreviewAllowed() ? getDetailItemId() : null;
  if (session && session.itemId === itemId && (session.root || session.timers.length)) {
    return;
  }

  stopDetailPreview();
  if (!itemId) {
    return;
  }

  generation += 1;
  session = {
    itemId,
    generation,
    backdrop: null,
    root: null,
    controller: null,
    observer: null,
    timers: [],
    inView: true
  };
  waitForBackdrop(session);
}

export function bindDetailPreview(): void {
  if (visibilityHandler) {
    return;
  }
  visibilityHandler = () => {
    if (session) {
      updatePlayback(session);
    }
  };
  document.addEventListener('visibilitychange', visibilityHandler);
  syncDetailPreview();
}

export function unbindDetailPreview(): void {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  stopDetailPreview();
}
