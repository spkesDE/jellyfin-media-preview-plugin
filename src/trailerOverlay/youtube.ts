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
