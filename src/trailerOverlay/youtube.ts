export const YOUTUBE_EMBED_UNAVAILABLE_ERROR_CODES = new Set([100, 101, 150]);
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

interface YouTubePlayerErrorEvent {
  data: number;
}

interface YouTubePlayerStateEvent {
  data: number;
}

interface YouTubePlayerReadyEvent {
  target: YouTubePlayer;
}

const YOUTUBE_PLAYER_STATE_ENDED = 0;
const YOUTUBE_PLAYER_STATE_PLAYING = 1;
const YOUTUBE_PLAYER_STATE_PAUSED = 2;

interface YouTubePlayer {
  destroy: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
}

interface YouTubePlayerApi {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onError: (event: YouTubePlayerErrorEvent) => void;
        onReady?: (event: YouTubePlayerReadyEvent) => void;
        onStateChange?: (event: YouTubePlayerStateEvent) => void;
      };
    }
  ) => YouTubePlayer;
}

export interface YouTubeEmbedMonitor {
  cleanup(): void;
  play(): void;
  pause(): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  isPaused(): boolean;
  isMuted(): boolean;
  getVolume(): number;
}

declare global {
  interface Window {
    YT?: YouTubePlayerApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youTubePlayerApiPromise: Promise<YouTubePlayerApi> | null = null;

function loadYouTubePlayerApi(): Promise<YouTubePlayerApi> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youTubePlayerApiPromise) {
    return youTubePlayerApiPromise;
  }

  youTubePlayerApiPromise = new Promise<YouTubePlayerApi>((resolve, reject) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('YouTube iframe API did not expose a Player constructor.'));
      }

      previousReadyHandler?.();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    if (existingScript) {
      existingScript.addEventListener('error', () => reject(new Error('Failed to load the YouTube iframe API.')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.addEventListener('error', () => reject(new Error('Failed to load the YouTube iframe API.')), {
      once: true
    });
    document.head.appendChild(script);
  }).catch((error) => {
    youTubePlayerApiPromise = null;
    throw error;
  });

  return youTubePlayerApiPromise;
}

export function monitorYouTubeEmbed(
  iframe: HTMLIFrameElement,
  callbacks: {
    onError: (errorCode: number) => void;
    onMonitorUnavailable?: () => void;
    onPlaybackStateChange?: () => void;
    loop?: boolean;
    initialMuted?: boolean;
    initialVolume?: number;
  }
): YouTubeEmbedMonitor {
  let disposed = false;
  let iframeLoaded = false;
  let api: YouTubePlayerApi | null = null;
  let player: YouTubePlayer | null = null;
  let playerStarted = false;
  let errorNotified = false;
  let ready = false;
  let paused = false;
  let muted = callbacks.initialMuted !== false;
  let volume = Math.max(0, Math.min(1, Number(callbacks.initialVolume) || 0));

  const startPlayer = () => {
    if (disposed || playerStarted || !iframeLoaded || !api || !iframe.isConnected) {
      return;
    }

    playerStarted = true;
    iframe.removeEventListener('load', handleIframeLoad);
    try {
      player = new api.Player(iframe, {
        events: {
          onError: (event) => {
            if (!disposed && !errorNotified) {
              errorNotified = true;
              callbacks.onError(Number(event.data));
            }
          },
          onReady: (event) => {
            if (disposed) {
              return;
            }
            player = event.target;
            ready = true;
            try {
              player.setVolume(Math.round(volume * 100));
              if (muted || volume === 0) {
                player.mute();
              } else {
                player.unMute();
              }
            } catch {
              /* the player may already be torn down */
            }
            callbacks.onPlaybackStateChange?.();
          },
          onStateChange: (event) => {
            const playerState = Number(event.data);
            if (playerState === YOUTUBE_PLAYER_STATE_PLAYING) {
              paused = false;
            } else if (playerState === YOUTUBE_PLAYER_STATE_PAUSED || playerState === YOUTUBE_PLAYER_STATE_ENDED) {
              paused = true;
            }
            callbacks.onPlaybackStateChange?.();
            /*
             * Looping through loop=1 requires a playlist parameter, which makes
             * the embed render playlist navigation over the preview. Restarting
             * on ENDED keeps the loop without that chrome.
             */
            if (disposed || !callbacks.loop || playerState !== YOUTUBE_PLAYER_STATE_ENDED) {
              return;
            }

            try {
              player?.seekTo(0, true);
              player?.playVideo();
            } catch {
              /* the player may already be torn down */
            }
          }
        }
      });
    } catch {
      callbacks.onMonitorUnavailable?.();
    }
  };

  function handleIframeLoad(): void {
    iframeLoaded = true;
    window.setTimeout(startPlayer, 0);
  }

  iframe.addEventListener('load', handleIframeLoad);

  loadYouTubePlayerApi()
    .then((loadedApi) => {
      api = loadedApi;
      startPlayer();
    })
    .catch(() => {
      if (!disposed) {
        callbacks.onMonitorUnavailable?.();
      }
    });

  return {
    cleanup() {
      disposed = true;
      iframe.removeEventListener('load', handleIframeLoad);
      player?.destroy();
      player = null;
      ready = false;
    },
    play() {
      paused = false;
      if (ready) player?.playVideo();
      callbacks.onPlaybackStateChange?.();
    },
    pause() {
      paused = true;
      if (ready) player?.pauseVideo();
      callbacks.onPlaybackStateChange?.();
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (ready) {
        if (muted) player?.mute();
        else player?.unMute();
      }
      callbacks.onPlaybackStateChange?.();
    },
    setVolume(nextVolume) {
      volume = Math.max(0, Math.min(1, Number(nextVolume) || 0));
      if (ready) player?.setVolume(Math.round(volume * 100));
      callbacks.onPlaybackStateChange?.();
    },
    isPaused: () => paused,
    isMuted: () => muted || volume === 0,
    getVolume: () => volume
  };
}

export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);
    const hostname = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();

    if (hostname === 'youtu.be') {
      const candidate = parsedUrl.pathname.replace(/^\/+/, '').split('/')[0] || '';
      return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
    }

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      const queryCandidate = parsedUrl.searchParams.get('v') || '';
      if (YOUTUBE_VIDEO_ID_PATTERN.test(queryCandidate)) {
        return queryCandidate;
      }

      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && ['embed', 'shorts', 'live'].includes(pathParts[0])) {
        const pathCandidate = pathParts[1];
        return YOUTUBE_VIDEO_ID_PATTERN.test(pathCandidate) ? pathCandidate : null;
      }
    }
  } catch {
    const directMatch = String(url).match(
      /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/i
    );
    return directMatch ? directMatch[1] : null;
  }

  return null;
}

export function buildYouTubeEmbedUrl(
  videoId: string | null | undefined,
  muted: boolean,
  options?: {
    controls?: boolean;
    startSeconds?: number;
    loop?: boolean;
  }
): string | null {
  if (!videoId) {
    return null;
  }

  const resolvedOptions = options || {};
  const controlsEnabled = !!resolvedOptions.controls;
  const startSeconds = Math.max(0, Math.floor(Number(resolvedOptions.startSeconds) || 0));

  return (
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` +
    '?autoplay=1' +
    `&mute=${muted ? '1' : '0'}` +
    `&controls=${controlsEnabled ? '1' : '0'}` +
    '&rel=0' +
    '&playsinline=1' +
    '&modestbranding=1' +
    '&showinfo=0' +
    '&iv_load_policy=3' +
    '&disablekb=1' +
    '&fs=0' +
    '&enablejsapi=1' +
    `&origin=${encodeURIComponent(window.location.origin)}` +
    (startSeconds > 0 ? `&start=${encodeURIComponent(startSeconds)}` : '') +
    (resolvedOptions.loop === false ? '' : `&loop=1&playlist=${encodeURIComponent(videoId)}`)
  );
}
