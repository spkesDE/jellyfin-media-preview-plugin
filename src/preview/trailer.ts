import { config } from '../config';
import { PREVIEW_SOURCE_TRAILER, SUPPORTED_TYPES } from '../constants';
import { buildApiUrl, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { trailerInfoCache } from '../core/storage';
import { requestJson } from '../core/request';
import { extractYouTubeVideoId } from '../trailerOverlay/youtube';
import type { JellyfinItem, JellyfinMediaSource, JellyfinRemoteTrailer } from '../types/jellyfin';
import type { AspectRatio, TrailerCandidate, TrailerInfo, TrailerPreview } from '../types/preview';

const SUPPORTED_VIDEO_CONTAINERS = new Set(['mp4', 'm4v', 'webm', 'ogg', 'ogv', 'mov']);
const unavailableYouTubeVideoIds = new Set<string>();

export function markYouTubeTrailerUnavailable(videoId: string | null | undefined): void {
  if (videoId) {
    unavailableYouTubeVideoIds.add(videoId);
  }
}

export function extractItemList(payload: unknown): JellyfinItem[] {
  if (Array.isArray(payload)) {
    return payload as JellyfinItem[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'Items' in payload &&
    Array.isArray((payload as { Items?: unknown[] }).Items)
  ) {
    return (payload as { Items: JellyfinItem[] }).Items;
  }

  return [];
}

export function getMediaSourceContainer(mediaSource: JellyfinMediaSource | null | undefined): string | null {
  if (!mediaSource?.Container) {
    return null;
  }

  return String(mediaSource.Container).split(',')[0].trim().toLowerCase() || null;
}

export function isSupportedVideoContainer(container: string | null | undefined): boolean {
  return SUPPORTED_VIDEO_CONTAINERS.has(container || '');
}

async function loadLocalTrailerCandidates(itemId: string, localTrailerCount: number): Promise<TrailerCandidate[]> {
  if (localTrailerCount <= 0) {
    return [];
  }

  try {
    const payload = await requestJson<unknown>(`Items/${encodeURIComponent(itemId)}/LocalTrailers`);
    return extractItemList(payload).map(normalizeLocalTrailerCandidate).filter(Boolean) as TrailerCandidate[];
  } catch (error) {
    debugLog('Failed to load local trailers.', itemId, error);
    return [];
  }
}

export function getMediaSourceAspectRatio(mediaSource: JellyfinMediaSource | null | undefined): AspectRatio {
  const streams = Array.isArray(mediaSource?.MediaStreams) ? mediaSource.MediaStreams : [];
  const videoStream = streams.find((stream) => {
    return !!stream && (stream.Type === 'Video' || stream.Type === 1) && stream.Width && stream.Height;
  });

  if (videoStream?.Width && videoStream.Height) {
    return {
      width: Number(videoStream.Width),
      height: Number(videoStream.Height)
    };
  }

  return {
    width: 16,
    height: 9
  };
}

export function getTrailerPreviewPixelSize(aspectRatio: AspectRatio | null | undefined): AspectRatio {
  const width = Math.max(320, Math.min(960, config.trickplayWidth * 2));
  const safeAspectRatio = aspectRatio?.width && aspectRatio?.height ? aspectRatio : { width: 16, height: 9 };

  return {
    width,
    height: Math.max(180, Math.round((width * safeAspectRatio.height) / safeAspectRatio.width))
  };
}

export function buildLocalTrailerStreamUrl(itemId: string, mediaSource: JellyfinMediaSource | null | undefined): string | null {
  const container = getMediaSourceContainer(mediaSource);
  if (!container || !isSupportedVideoContainer(container)) {
    return null;
  }

  return buildApiUrl(`Videos/${encodeURIComponent(itemId)}/stream.${encodeURIComponent(container)}`, {
    Static: 'true',
    mediaSourceId: mediaSource?.Id
  });
}

export function buildLocalTrailerTranscodeUrl(
  itemId: string,
  mediaSource: JellyfinMediaSource | null | undefined,
  aspectRatio: AspectRatio
): string | null {
  const previewSize = getTrailerPreviewPixelSize(aspectRatio);
  return buildApiUrl(`Videos/${encodeURIComponent(itemId)}/stream.mp4`, {
    mediaSourceId: mediaSource?.Id,
    VideoCodec: 'h264',
    AudioCodec: 'aac',
    Width: previewSize.width,
    Height: previewSize.height
  });
}

export function normalizeRemoteTrailerCandidate(
  remoteTrailer: JellyfinRemoteTrailer | null | undefined
): TrailerCandidate | null {
  if (!remoteTrailer?.Url) {
    return null;
  }

  const youtubeId = extractYouTubeVideoId(remoteTrailer.Url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      kind: 'iframe',
      title: remoteTrailer.Name || 'Remote Trailer',
      youtubeId,
      aspectRatio: {
        width: 16,
        height: 9
      }
    };
  }

  try {
    const parsedUrl = new URL(remoteTrailer.Url, window.location.origin);
    const extension = parsedUrl.pathname.split('.').pop()?.toLowerCase() || '';
    if (isSupportedVideoContainer(extension)) {
      return {
        provider: 'remote-video',
        kind: 'video',
        title: remoteTrailer.Name || 'Remote Trailer',
        src: parsedUrl.toString(),
        aspectRatio: {
          width: 16,
          height: 9
        }
      };
    }
  } catch (error) {
    debugLog('Failed to parse remote trailer URL.', remoteTrailer.Url, error);
  }

  return null;
}

export function normalizeLocalTrailerCandidate(trailerItem: JellyfinItem | null | undefined): TrailerCandidate | null {
  if (!trailerItem?.Id) {
    return null;
  }

  const mediaSources = Array.isArray(trailerItem.MediaSources) ? trailerItem.MediaSources : [];
  const playableMediaSource = mediaSources.find((mediaSource) => {
    return !!buildLocalTrailerTranscodeUrl(trailerItem.Id!, mediaSource, getMediaSourceAspectRatio(mediaSource));
  });

  if (!playableMediaSource) {
    return null;
  }

  const aspectRatio = getMediaSourceAspectRatio(playableMediaSource);
  const directSrc = buildLocalTrailerStreamUrl(trailerItem.Id, playableMediaSource);
  const transcodeSrc = buildLocalTrailerTranscodeUrl(trailerItem.Id, playableMediaSource, aspectRatio);

  return {
    provider: 'local-trailer',
    kind: 'video',
    title: trailerItem.Name || 'Local Trailer',
    src: directSrc || transcodeSrc || undefined,
    fallbackSrc: directSrc && transcodeSrc && directSrc !== transcodeSrc ? transcodeSrc : null,
    aspectRatio
  };
}

export function isLocalTrailerCandidate(candidate: TrailerCandidate | null | undefined): boolean {
  return candidate?.provider === 'local-trailer';
}

export function isTrailerCandidateAllowed(
  candidate: TrailerCandidate | null | undefined
): boolean {
  if (!candidate) {
    return false;
  }

  if (isLocalTrailerCandidate(candidate)) {
    return true;
  }

  if (candidate.provider === 'youtube' && candidate.youtubeId) {
    return !unavailableYouTubeVideoIds.has(candidate.youtubeId);
  }

  return true;
}

export function getTrailerInfo(itemId: string | null | undefined): Promise<TrailerInfo | null> {
  if (!itemId) {
    return Promise.resolve(null);
  }

  if (trailerInfoCache.has(itemId)) {
    return trailerInfoCache.get(itemId)!;
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  if (!apiClient || !userId) {
    debugLog('Skipping trailer fetch because ApiClient or user id is missing.', itemId);
    return Promise.resolve(null);
  }

  const request = requestJson<JellyfinItem>(`Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`, {
    Fields: 'LocalTrailerCount,RemoteTrailers'
  }).then(async (item) => {
    if (!item || !SUPPORTED_TYPES.has(item.Type || '')) {
      return null;
    }

    const localCandidates = await loadLocalTrailerCandidates(itemId, Number(item.LocalTrailerCount) || 0);
    const remoteCandidates = Array.isArray(item.RemoteTrailers)
      ? item.RemoteTrailers.map(normalizeRemoteTrailerCandidate).filter(Boolean) as TrailerCandidate[]
      : [];

    const candidates = localCandidates.concat(remoteCandidates);
    if (!candidates.length) {
      debugLog('No usable trailer candidates found.', {
        itemId,
        localTrailerCount: item.LocalTrailerCount || 0,
        remoteTrailerCount: Array.isArray(item.RemoteTrailers) ? item.RemoteTrailers.length : 0
      });
      return null;
    }

    const trailerInfo: TrailerInfo = {
      itemId,
      candidates
    };
    debugLog('Resolved trailer candidates.', trailerInfo);
    return trailerInfo;
  }).catch((error) => {
    debugLog('Failed to resolve trailer info for item.', itemId, error);
    trailerInfoCache.delete(itemId);
    return null;
  });

  trailerInfoCache.set(itemId, request);
  return request.then((result) => {
    if (!result) {
      trailerInfoCache.delete(itemId);
    }

    return result;
  });
}

export function getTrailerPreview(
  itemId: string
): Promise<TrailerPreview | null> {
  return getTrailerInfo(itemId).then((info) => {
    if (!info?.candidates?.length) {
      return null;
    }

    const candidate = info.candidates.find((entry) => isTrailerCandidateAllowed(entry));
    if (!candidate) {
      return null;
    }

    return {
      source: PREVIEW_SOURCE_TRAILER,
      trailer: candidate,
      info: {
        frameWidth: candidate.aspectRatio.width,
        frameHeight: candidate.aspectRatio.height
      }
    };
  });
}
