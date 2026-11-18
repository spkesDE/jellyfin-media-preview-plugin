import { config } from '../config';
import { getApiContextKey, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';

/** A media segment as returned by Jellyfin 10.10+ (`GET /MediaSegments/{itemId}`). */
export interface MediaSegment {
  Type?: string;
  StartTicks?: number;
  EndTicks?: number;
}

interface MediaSegmentsResponse {
  Items?: MediaSegment[];
}

/** Segments a preview should never start in. */
const SKIPPED_SEGMENT_TYPES = new Set(['Intro', 'Recap', 'Preview', 'Commercial']);
const SEGMENT_CACHE_LIMIT = 300;
const TICKS_PER_SECOND = 10_000_000;

const segmentCache = new Map<string, Promise<MediaSegment[]>>();

function toSeconds(ticks: number | undefined): number {
  return Math.max(0, Number(ticks) || 0) / TICKS_PER_SECOND;
}

/**
 * Moves a preview start out of intros, recaps, previews and commercials, and keeps the preview
 * window ahead of the end credits when there is room for it. Pure, so it is easy to test.
 */
export function adjustStartForSegments(
  startSeconds: number,
  segments: MediaSegment[],
  previewDurationSeconds: number,
  runtimeSeconds: number
): number {
  if (!segments.length) {
    return startSeconds;
  }

  const skipped = segments
    .filter((segment) => SKIPPED_SEGMENT_TYPES.has(String(segment.Type)))
    .map((segment) => ({ start: toSeconds(segment.StartTicks), end: toSeconds(segment.EndTicks) }))
    .filter((segment) => segment.end > segment.start)
    .sort((left, right) => left.start - right.start);

  let start = startSeconds;
  // Segments can follow each other (recap, then intro), so keep moving until none contains the start.
  for (const segment of skipped) {
    if (start >= segment.start && start < segment.end) {
      start = Math.ceil(segment.end);
    }
  }

  const duration = Math.max(0, previewDurationSeconds);
  const outroStart = segments
    .filter((segment) => segment.Type === 'Outro')
    .map((segment) => toSeconds(segment.StartTicks))
    .filter((value) => value > 0)
    .sort((left, right) => left - right)[0];
  if (outroStart !== undefined && start + duration > outroStart) {
    const beforeOutro = Math.floor(outroStart - duration);
    const inSkipped = skipped.some((segment) => beforeOutro >= segment.start && beforeOutro < segment.end);
    if (beforeOutro >= 0 && !inSkipped) {
      start = beforeOutro;
    }
  }

  const runtime = Math.max(0, runtimeSeconds);
  const latestStart = duration > 0 && runtime > 0 ? Math.max(0, runtime - duration) : runtime || start;
  return Math.max(0, Math.min(start, latestStart));
}

/** Loads an item's media segments; servers without the API (or without segments) give an empty list. */
export function getMediaSegments(itemId: string): Promise<MediaSegment[]> {
  if (!config.directPlaySkipSegmentsEnabled || !itemId) {
    return Promise.resolve([]);
  }

  const cacheKey = `${getApiContextKey(getGlobalApiClient()) || 'anonymous'}|${itemId}`;
  const cached = segmentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = requestJson<MediaSegmentsResponse>(`MediaSegments/${encodeURIComponent(itemId)}`)
    .then((response) => (Array.isArray(response?.Items) ? response.Items : []))
    .catch((error: unknown) => {
      debugLog('Media segments are unavailable for this item.', { itemId, error });
      return [];
    });

  if (segmentCache.size >= SEGMENT_CACHE_LIMIT) {
    const oldestKey = segmentCache.keys().next().value;
    if (oldestKey !== undefined) {
      segmentCache.delete(oldestKey);
    }
  }
  segmentCache.set(cacheKey, request);
  return request;
}

export function clearMediaSegmentCache(): void {
  segmentCache.clear();
}
