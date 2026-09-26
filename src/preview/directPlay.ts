import { DIRECT_PLAY_TYPES, PREVIEW_SOURCE_DIRECT_PLAY } from '../constants';
import { buildApiUrl, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import type { JellyfinItem, JellyfinMediaSource } from '../types/jellyfin';
import type { AspectRatio, DirectPlayPreview, TrailerCandidate } from '../types/preview';

const SUPPORTED_DIRECT_PLAY_CONTAINERS = new Set(['mp4', 'm4v', 'webm', 'ogg', 'ogv', 'mov']);
const FAILED_DIRECT_PLAY_RETRY_MS = 2 * 60 * 1000;
const failedDirectPlayItems = new Map<string, number>();

function getContainer(mediaSource: JellyfinMediaSource | null | undefined): string | null {
  return (
    String(mediaSource?.Container || '')
      .split(',')[0]
      .trim()
      .toLowerCase() || null
  );
}

function getAspectRatio(mediaSource: JellyfinMediaSource | null | undefined): AspectRatio {
  const videoStream = mediaSource?.MediaStreams?.find(
    (stream) => !!stream && (stream.Type === 'Video' || stream.Type === 1) && stream.Width && stream.Height
  );

  return videoStream?.Width && videoStream.Height
    ? { width: Number(videoStream.Width), height: Number(videoStream.Height) }
    : { width: 16, height: 9 };
}

function isDirectPlayTemporarilyUnavailable(itemId: string): boolean {
  const retryAt = failedDirectPlayItems.get(itemId);
  if (!retryAt) {
    return false;
  }
  if (retryAt > Date.now()) {
    return true;
  }
  failedDirectPlayItems.delete(itemId);
  return false;
}

export function markDirectPlayUnavailable(itemId: string): void {
  failedDirectPlayItems.set(itemId, Date.now() + FAILED_DIRECT_PLAY_RETRY_MS);
}

export function clearDirectPlayFallbackState(): void {
  failedDirectPlayItems.clear();
}

function createDirectPlayCandidate(
  item: JellyfinItem,
  mediaSource: JellyfinMediaSource,
  percent: number
): TrailerCandidate | null {
  if (!item.Id) {
    return null;
  }

  const container = getContainer(mediaSource);
  const aspectRatio = getAspectRatio(mediaSource);
  const runtimeSeconds = Math.max(0, Number(item.RunTimeTicks) || 0) / 10_000_000;
  const startSeconds = Math.floor(runtimeSeconds * Math.max(0, Math.min(1, percent)));
  const directSrc =
    container && SUPPORTED_DIRECT_PLAY_CONTAINERS.has(container)
      ? buildApiUrl(`Videos/${encodeURIComponent(item.Id)}/stream.${encodeURIComponent(container)}`, {
          Static: true,
          mediaSourceId: mediaSource.Id
        })
      : null;
  const transcodeSrc = buildApiUrl(`Videos/${encodeURIComponent(item.Id)}/stream.mp4`, {
    mediaSourceId: mediaSource.Id,
    VideoCodec: 'h264',
    AudioCodec: 'aac',
    StartTimeTicks: Math.floor(startSeconds * 10_000_000)
  });
  const src = directSrc || transcodeSrc;
  if (!src) {
    return null;
  }

  return {
    provider: 'direct-play',
    kind: 'video',
    title: item.Name || 'Direct Play Preview',
    src,
    fallbackSrc: directSrc && transcodeSrc && directSrc !== transcodeSrc ? transcodeSrc : null,
    startSeconds: directSrc ? startSeconds : 0,
    aspectRatio
  };
}

export async function getDirectPlayPreview(itemId: string, percent: number): Promise<DirectPlayPreview | null> {
  if (!itemId || isDirectPlayTemporarilyUnavailable(itemId)) {
    return null;
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  if (!apiClient || !userId) {
    return null;
  }

  try {
    const item = await requestJson<JellyfinItem>(
      `Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`,
      { Fields: 'MediaSources,RunTimeTicks' }
    );
    if (!item?.Id || !DIRECT_PLAY_TYPES.has(item.Type || '')) {
      return null;
    }

    const mediaSources = Array.isArray(item.MediaSources) ? item.MediaSources : [];
    const mediaSource =
      mediaSources.find((source) => SUPPORTED_DIRECT_PLAY_CONTAINERS.has(getContainer(source) || '')) ||
      mediaSources[0];
    const candidate = mediaSource ? createDirectPlayCandidate(item, mediaSource, percent) : null;
    if (!candidate) {
      return null;
    }

    return {
      source: PREVIEW_SOURCE_DIRECT_PLAY,
      itemId,
      trailer: candidate,
      info: {
        frameWidth: candidate.aspectRatio.width,
        frameHeight: candidate.aspectRatio.height
      }
    };
  } catch (error) {
    debugLog('Failed to resolve Direct Play preview.', itemId, error);
    return null;
  }
}
