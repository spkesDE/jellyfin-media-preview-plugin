export const YOUTUBE_EMBED_UNAVAILABLE_ERROR_CODES = new Set([100, 101, 150]);

interface YouTubePlayerErrorEvent {
  data: number;
}

interface YouTubePlayer {
  destroy: () => void;
}

interface YouTubePlayerApi {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onError: (event: YouTubePlayerErrorEvent) => void;
      };
    }
  ) => YouTubePlayer;
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

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
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
  }
): () => void {
  let disposed = false;
  let iframeLoaded = false;
  let api: YouTubePlayerApi | null = null;
  let player: YouTubePlayer | null = null;
  let playerStarted = false;
  let errorNotified = false;

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

  loadYouTubePlayerApi().then((loadedApi) => {
    api = loadedApi;
    startPlayer();
  }).catch(() => {
    if (!disposed) {
      callbacks.onMonitorUnavailable?.();
    }
  });

  return () => {
    disposed = true;
    iframe.removeEventListener('load', handleIframeLoad);
    player?.destroy();
    player = null;
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
      return parsedUrl.pathname.replace(/^\/+/, '').split('/')[0] || null;
    }

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      if (parsedUrl.searchParams.get('v')) {
        return parsedUrl.searchParams.get('v');
      }

      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const embedIndex = pathParts.indexOf('embed');
      if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
        return pathParts[embedIndex + 1];
      }
    }
  } catch {
    const directMatch = String(url).match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/i);
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
  }
): string | null {
  if (!videoId) {
    return null;
  }

  const resolvedOptions = options || {};
  const controlsEnabled = !!resolvedOptions.controls;
  const startSeconds = Math.max(0, Math.floor(Number(resolvedOptions.startSeconds) || 0));

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
    + '?autoplay=1'
    + `&mute=${muted ? '1' : '0'}`
    + `&controls=${controlsEnabled ? '1' : '0'}`
    + '&rel=0'
    + '&playsinline=1'
    + '&modestbranding=1'
    + '&showinfo=0'
    + '&iv_load_policy=3'
    + '&disablekb=1'
    + '&fs=0'
    + '&enablejsapi=1'
    + `&origin=${encodeURIComponent(window.location.origin)}`
    + (startSeconds > 0 ? `&start=${encodeURIComponent(startSeconds)}` : '')
    + '&loop=1'
    + `&playlist=${encodeURIComponent(videoId)}`;
}
