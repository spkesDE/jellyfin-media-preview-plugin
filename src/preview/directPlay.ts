import { DIRECT_PLAY_TYPES, PREVIEW_SOURCE_DIRECT_PLAY } from '../constants';
import { config } from '../config';
import { buildApiUrl, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { postJsonForResult, requestJson } from '../core/request';
import type { JellyfinItem, JellyfinMediaSource, JellyfinPlaybackInfoResponse } from '../types/jellyfin';
import type { AspectRatio, DirectPlayPreview, TrailerCandidate } from '../types/preview';
import { adjustStartForSegments, getMediaSegments, type MediaSegment } from './mediaSegments';

const SUPPORTED_DIRECT_PLAY_CONTAINERS = new Set(['mp4', 'm4v', 'webm', 'ogg', 'ogv', 'mov']);
const FAILED_DIRECT_PLAY_RETRY_MS = 2 * 60 * 1000;
const failedDirectPlayItems = new Map<string, number>();
// A remux copies the original stream, so its bitrate is the source bitrate. The limit only
// keeps Jellyfin from offering a remux for extreme sources; anything above it is transcoded.
const REMUX_MAX_STREAMING_BITRATE = 140_000_000;
/**
 * Transcode reasons that leave the video stream untouched. When Jellyfin only names these,
 * its TranscodingUrl copies the video and at most re-encodes audio, which is cheap.
 */
const VIDEO_COPY_TRANSCODE_REASONS = new Set([
  'ContainerNotSupported',
  'AudioCodecNotSupported',
  'AudioIsExternal',
  'SecondaryAudioNotSupported',
  'AudioChannelsNotSupported',
  'AudioProfileNotSupported',
  'AudioSampleRateNotSupported',
  'AudioBitDepthNotSupported',
  'AudioBitrateNotSupported',
  'UnknownAudioStreamInfo',
  // Only harmless because getRemuxUrlFromMediaSource drops the subtitle from the URL.
  'SubtitleCodecNotSupported'
]);

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
  previewDurationSeconds: number,
  resumePositionSeconds?: number | null
): number {
  const normalizedRuntime = Math.max(0, Number(runtimeSeconds) || 0);
  const configuredStart = Math.floor(normalizedRuntime * Math.max(0, Math.min(0.9, startPercent / 100)));
  const requestedStart =
    resumePositionSeconds !== null && resumePositionSeconds !== undefined && Number(resumePositionSeconds) > 0
      ? Math.floor(Number(resumePositionSeconds))
      : configuredStart;
  const duration = Math.max(0, Number(previewDurationSeconds) || 0);
  const latestStart = duration > 0 ? Math.max(0, normalizedRuntime - duration) : normalizedRuntime;

  return Math.min(requestedStart, latestStart);
}

/**
 * Where a Direct Play preview starts: the saved position when resuming, otherwise the configured
 * percentage moved out of intros and recaps (see mediaSegments.ts).
 */
export function getDirectPlayStartSeconds(
  item: JellyfinItem,
  resumePositionTicks?: number | null,
  segments: MediaSegment[] = []
): number {
  const runtimeSeconds = Math.max(0, Number(item.RunTimeTicks) || 0) / 10_000_000;
  const previewDurationSeconds = Math.max(0, Number(config.directPlayPreviewDurationSeconds) || 0);
  const resumeSeconds = resumePositionTicks ? Number(resumePositionTicks) / 10_000_000 : null;
  const startSeconds = resolveDirectPlayStartSeconds(
    runtimeSeconds,
    Number(config.directPlayStartPercent) || 0,
    previewDurationSeconds,
    resumeSeconds
  );

  // A saved position is where the viewer stopped; it is never moved.
  if (resumeSeconds !== null && resumeSeconds > 0) {
    return startSeconds;
  }

  return adjustStartForSegments(startSeconds, segments, previewDurationSeconds, runtimeSeconds);
}

export function createDirectPlayCandidate(
  item: JellyfinItem,
  mediaSource: JellyfinMediaSource,
  resumePositionTicks?: number | null,
  remuxSrc?: string | null,
  segments: MediaSegment[] = []
): TrailerCandidate | null {
  if (!config.directPlayPreviewEnabled || !item.Id) {
    return null;
  }

  const container = getContainer(mediaSource);
  const aspectRatio = getAspectRatio(mediaSource);
  const previewDurationSeconds = Math.max(0, Number(config.directPlayPreviewDurationSeconds) || 0);
  const startSeconds = getDirectPlayStartSeconds(item, resumePositionTicks, segments);
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
  const sources = Array.from(
    new Set([directSrc, remuxSrc || null, transcodeSrc].filter((value): value is string => !!value))
  );
  const src = sources[0];
  if (!src) {
    return null;
  }

  return {
    provider: 'direct-play',
    kind: 'video',
    title: item.Name || 'Direct Play Preview',
    src,
    fallbackSrc: sources[1] || null,
    // Remux and transcode URLs already start at StartTimeTicks; only static files are seeked.
    startSeconds: src === directSrc ? startSeconds : 0,
    playbackRate: Math.max(0.5, Math.min(2, Number(config.directPlayPlaybackRate) || 1.5)),
    previewDurationSeconds,
    aspectRatio
  };
}

function canPlay(probe: HTMLVideoElement, type: string): boolean {
  try {
    return probe.canPlayType(type) !== '';
  } catch {
    return false;
  }
}

/**
 * A minimal device profile describing what this browser can decode. Jellyfin uses it to decide
 * whether the original file plays as is, can be remuxed (stream copy) or needs a transcode.
 */
export function buildPreviewDeviceProfile(): Record<string, unknown> {
  const probe = document.createElement('video');
  const mp4VideoCodecs = ['h264'];
  if (
    canPlay(probe, 'video/mp4; codecs="hvc1.1.6.L120.90"') ||
    canPlay(probe, 'video/mp4; codecs="hev1.1.6.L120.90"')
  ) {
    mp4VideoCodecs.push('hevc');
  }
  if (canPlay(probe, 'video/mp4; codecs="av01.0.08M.08"')) {
    mp4VideoCodecs.push('av1');
  }
  if (canPlay(probe, 'video/mp4; codecs="vp09.00.10.08"')) {
    mp4VideoCodecs.push('vp9');
  }

  const mp4AudioCodecs = ['aac'];
  if (canPlay(probe, 'audio/mpeg')) {
    mp4AudioCodecs.push('mp3');
  }
  if (canPlay(probe, 'audio/mp4; codecs="opus"')) {
    mp4AudioCodecs.push('opus');
  }
  if (canPlay(probe, 'audio/mp4; codecs="flac"')) {
    mp4AudioCodecs.push('flac');
  }
  if (canPlay(probe, 'audio/mp4; codecs="ac-3"')) {
    mp4AudioCodecs.push('ac3');
  }
  if (canPlay(probe, 'audio/mp4; codecs="ec-3"')) {
    mp4AudioCodecs.push('eac3');
  }

  const webmVideoCodecs = ['vp8', 'vp9', 'av1'].filter((codec) =>
    canPlay(probe, `video/webm; codecs="${codec === 'av1' ? 'av01.0.08M.08' : codec}"`)
  );
  const webmAudioCodecs = ['opus', 'vorbis'].filter((codec) => canPlay(probe, `audio/webm; codecs="${codec}"`));

  return {
    Name: 'Jellyfin Media Preview',
    MaxStreamingBitrate: REMUX_MAX_STREAMING_BITRATE,
    MaxStaticBitrate: REMUX_MAX_STREAMING_BITRATE,
    DirectPlayProfiles: [
      {
        Container: 'mp4,m4v,mov',
        Type: 'Video',
        VideoCodec: mp4VideoCodecs.join(','),
        AudioCodec: mp4AudioCodecs.join(',')
      },
      ...(webmVideoCodecs.length
        ? [
            {
              Container: 'webm',
              Type: 'Video',
              VideoCodec: webmVideoCodecs.join(','),
              AudioCodec: webmAudioCodecs.join(',')
            }
          ]
        : [])
    ],
    TranscodingProfiles: [
      {
        Container: 'mp4',
        Type: 'Video',
        VideoCodec: mp4VideoCodecs.join(','),
        AudioCodec: 'aac',
        Protocol: 'http',
        Context: 'Streaming',
        MaxAudioChannels: '2'
      }
    ],
    ContainerProfiles: [],
    CodecProfiles: [],
    SubtitleProfiles: []
  };
}

/**
 * Returns Jellyfin's TranscodingUrl as a playable URL when it only remuxes: progressive HTTP
 * and every transcode reason leaves the video stream as is. A full video transcode returns
 * null so the cheaper, size-capped preview transcode is used instead.
 */
export function getRemuxUrlFromMediaSource(
  mediaSource: JellyfinMediaSource | null | undefined,
  startSeconds: number
): string | null {
  const transcodingUrl = mediaSource?.TranscodingUrl;
  if (!transcodingUrl) {
    return null;
  }
  if (mediaSource.TranscodingSubProtocol && mediaSource.TranscodingSubProtocol.toLowerCase() !== 'http') {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(transcodingUrl, 'http://jellyfin.invalid');
  } catch {
    return null;
  }

  const query: Record<string, string> = {};
  let reasons: string[] = [];
  parsed.searchParams.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    // Previews never show subtitles. A subtitle in the URL makes Jellyfin burn it into the
    // picture, which forces a full video transcode instead of a remux.
    if (
      lowerKey === 'apikey' ||
      lowerKey === 'api_key' ||
      lowerKey === 'starttimeticks' ||
      lowerKey === 'subtitlestreamindex' ||
      lowerKey === 'subtitlemethod' ||
      lowerKey === 'subtitlecodec'
    ) {
      return;
    }
    if (lowerKey === 'transcodereasons') {
      reasons = value
        .split(',')
        .map((reason) => reason.trim())
        .filter(Boolean);
    }
    query[key] = value;
  });

  if (!reasons.length || reasons.some((reason) => !VIDEO_COPY_TRANSCODE_REASONS.has(reason))) {
    return null;
  }

  query.StartTimeTicks = String(Math.max(0, Math.floor(startSeconds * 10_000_000)));
  return buildApiUrl(parsed.pathname.replace(/^\/+/, ''), query);
}

async function resolveRemuxSrc(
  item: JellyfinItem,
  mediaSource: JellyfinMediaSource,
  userId: string,
  startSeconds: number
): Promise<string | null> {
  try {
    const playbackInfo = await postJsonForResult<JellyfinPlaybackInfoResponse>(
      `Items/${encodeURIComponent(item.Id || '')}/PlaybackInfo`,
      {
        UserId: userId,
        DeviceProfile: buildPreviewDeviceProfile(),
        MaxStreamingBitrate: REMUX_MAX_STREAMING_BITRATE,
        StartTimeTicks: Math.floor(startSeconds * 10_000_000),
        MediaSourceId: mediaSource.Id,
        MaxAudioChannels: 2,
        // No subtitles: otherwise a default subtitle track is burned in and the video re-encoded.
        SubtitleStreamIndex: -1,
        EnableDirectPlay: true,
        EnableDirectStream: true,
        EnableTranscoding: true,
        AllowVideoStreamCopy: true,
        AllowAudioStreamCopy: true,
        AutoOpenLiveStream: false
      },
      { UserId: userId }
    );
    const resolvedSource =
      playbackInfo?.MediaSources?.find((source) => source.Id === mediaSource.Id) || playbackInfo?.MediaSources?.[0];
    const remuxSrc = getRemuxUrlFromMediaSource(resolvedSource, startSeconds);
    debugLog('Resolved Direct Play remux option.', {
      itemId: item.Id,
      mediaSourceId: mediaSource.Id,
      hasTranscodingUrl: !!resolvedSource?.TranscodingUrl,
      usesRemux: !!remuxSrc
    });
    return remuxSrc;
  } catch (error) {
    debugLog('PlaybackInfo request for a Direct Play remux failed.', { itemId: item.Id, error });
    return null;
  }
}

export async function getDirectPlayPreview(
  itemId: string,
  resumePositionTicks: number | null = null
): Promise<DirectPlayPreview | null> {
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
    // Segments are only needed when the preview does not resume a saved position.
    const segmentsPromise = resumePositionTicks ? Promise.resolve([]) : getMediaSegments(itemId);
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
    const needsServerHelp = !!mediaSource && !SUPPORTED_DIRECT_PLAY_CONTAINERS.has(getContainer(mediaSource) || '');
    const segments = await segmentsPromise;
    const startSeconds = getDirectPlayStartSeconds(item, resumePositionTicks, segments);
    const remuxSrc =
      mediaSource && needsServerHelp && config.directPlayRemuxEnabled
        ? await resolveRemuxSrc(item, mediaSource, userId, startSeconds)
        : null;
    const candidate = mediaSource
      ? createDirectPlayCandidate(item, mediaSource, resumePositionTicks, remuxSrc, segments)
      : null;
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
