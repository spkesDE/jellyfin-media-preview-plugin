import { DIRECT_PLAY_TYPES, PREVIEW_SOURCE_DIRECT_PLAY } from '../constants';
import { config } from '../config';
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

function getDirectPlayRetryRemainingMs(itemId: string): number {
  return Math.max(0, (failedDirectPlayItems.get(itemId) || 0) - Date.now());
}

export function markDirectPlayUnavailable(itemId: string): void {
  failedDirectPlayItems.set(itemId, Date.now() + FAILED_DIRECT_PLAY_RETRY_MS);
  debugLog('Direct Play marked temporarily unavailable after a media playback failure.', {
    itemId,
    retryAfterMs: FAILED_DIRECT_PLAY_RETRY_MS
  });
}

export function clearDirectPlayFallbackState(): void {
  failedDirectPlayItems.clear();
}

export function resolveDirectPlayStartSeconds(
  runtimeSeconds: number,
  startPercent: number,
  previewDurationSeconds: number
): number {
  const normalizedRuntime = Math.max(0, Number(runtimeSeconds) || 0);
  const requestedStart = Math.floor(normalizedRuntime * Math.max(0, Math.min(0.9, startPercent / 100)));
  const duration = Math.max(0, Number(previewDurationSeconds) || 0);
  const latestStart = duration > 0 ? Math.max(0, normalizedRuntime - duration) : normalizedRuntime;

  return Math.min(requestedStart, latestStart);
}

export function createDirectPlayCandidate(
  item: JellyfinItem,
  mediaSource: JellyfinMediaSource
): TrailerCandidate | null {
  if (!config.directPlayPreviewEnabled || !item.Id) {
    return null;
  }

  const container = getContainer(mediaSource);
  const aspectRatio = getAspectRatio(mediaSource);
  const runtimeSeconds = Math.max(0, Number(item.RunTimeTicks) || 0) / 10_000_000;
  const previewDurationSeconds = Math.max(0, Number(config.directPlayPreviewDurationSeconds) || 0);
  const startSeconds = resolveDirectPlayStartSeconds(
    runtimeSeconds,
    Number(config.directPlayStartPercent) || 0,
    previewDurationSeconds
  );
  const directSrc =
    container && SUPPORTED_DIRECT_PLAY_CONTAINERS.has(container)
      ? buildApiUrl(`Videos/${encodeURIComponent(item.Id)}/stream.${encodeURIComponent(container)}`, {
          Static: true,
          mediaSourceId: mediaSource.Id
        })
      : null;
  const transcodeVideoBitrate = Math.max(250, Number(config.directPlayTranscodeVideoBitrateKbps) || 1500) * 1000;
  const transcodeSrc = config.directPlayTranscodeFallbackEnabled
    ? buildApiUrl(`Videos/${encodeURIComponent(item.Id)}/stream.mp4`, {
        mediaSourceId: mediaSource.Id,
        VideoCodec: 'h264',
        AudioCodec: 'aac',
        MaxHeight: Math.max(240, Number(config.directPlayTranscodeMaxHeight) || 480),
        VideoBitRate: transcodeVideoBitrate,
        MaxStreamingBitrate: transcodeVideoBitrate + 128_000,
        StartTimeTicks: Math.floor(startSeconds * 10_000_000)
      })
    : null;
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
    playbackRate: Math.max(0.5, Math.min(2, Number(config.directPlayPlaybackRate) || 1.5)),
    previewDurationSeconds,
    aspectRatio
  };
}

export async function getDirectPlayPreview(itemId: string): Promise<DirectPlayPreview | null> {
  if (!config.directPlayPreviewEnabled) {
    debugLog('Skipping Direct Play because Direct Play Preview is disabled.', { itemId });
    return null;
  }
  if (!itemId) {
    debugLog('Skipping Direct Play because the item id is missing.');
    return null;
  }
  if (isDirectPlayTemporarilyUnavailable(itemId)) {
    debugLog('Skipping Direct Play after a recent media playback failure.', {
      itemId,
      retryRemainingMs: getDirectPlayRetryRemainingMs(itemId)
    });
    return null;
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  if (!apiClient || !userId) {
    debugLog('Skipping Direct Play because ApiClient or user id is missing.', {
      itemId,
      hasApiClient: !!apiClient,
      hasUserId: !!userId
    });
    return null;
  }

  try {
    const item = await requestJson<JellyfinItem>(
      `Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`,
      { Fields: 'MediaSources,RunTimeTicks' }
    );
    if (!item?.Id || !DIRECT_PLAY_TYPES.has(item.Type || '')) {
      debugLog('Direct Play metadata is missing or the item type is not playable.', {
        itemId,
        resolvedItemId: item?.Id || null,
        itemType: item?.Type || null
      });
      return null;
    }

    const mediaSources = Array.isArray(item.MediaSources) ? item.MediaSources : [];
    debugLog('Resolved Direct Play metadata.', {
      itemId,
      itemType: item.Type,
      runtimeTicks: item.RunTimeTicks || null,
      mediaSources: mediaSources.map((source) => ({
        id: source.Id || null,
        container: getContainer(source),
        browserContainerCandidate: SUPPORTED_DIRECT_PLAY_CONTAINERS.has(getContainer(source) || '')
      }))
    });
    const mediaSource =
      mediaSources.find((source) => SUPPORTED_DIRECT_PLAY_CONTAINERS.has(getContainer(source) || '')) ||
      mediaSources[0];
    const candidate = mediaSource ? createDirectPlayCandidate(item, mediaSource) : null;
    if (!candidate) {
      debugLog('Direct Play has no usable media candidate.', {
        itemId,
        mediaSourceCount: mediaSources.length,
        selectedContainer: getContainer(mediaSource),
        transcodeFallbackEnabled: config.directPlayTranscodeFallbackEnabled
      });
      return null;
    }

    debugLog('Direct Play candidate resolved.', {
      itemId,
      container: getContainer(mediaSource),
      hasTranscodeFallback: !!candidate.fallbackSrc,
      startsWithTranscode: !SUPPORTED_DIRECT_PLAY_CONTAINERS.has(getContainer(mediaSource) || ''),
      startSeconds: candidate.startSeconds,
      playbackRate: candidate.playbackRate,
      previewDurationSeconds: candidate.previewDurationSeconds
    });

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
