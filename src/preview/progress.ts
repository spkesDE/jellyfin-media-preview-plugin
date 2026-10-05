import { getApiContextKey, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import { getScopedPreviewCacheKey, playbackProgressCache } from '../core/storage';
import type { JellyfinItem } from '../types/jellyfin';
import type { PlaybackProgress } from '../types/preview';

const PLAYBACK_PROGRESS_CACHE_MS = 30_000;

export function resolvePlaybackProgress(item: JellyfinItem | null | undefined): PlaybackProgress {
  const positionTicks = Math.max(0, Number(item?.UserData?.PlaybackPositionTicks) || 0);
  const runtimeTicks = Math.max(0, Number(item?.RunTimeTicks) || 0);
  const isBeforeEnd = runtimeTicks <= 0 || positionTicks < runtimeTicks;
  const positionPercent = runtimeTicks > 0 ? Math.max(0, Math.min(1, positionTicks / runtimeTicks)) : null;

  return {
    isInProgress: positionTicks > 0 && item?.UserData?.Played !== true && isBeforeEnd,
    positionTicks,
    positionPercent
  };
}

export function getPlaybackProgressForItem(itemId: string | null | undefined): Promise<PlaybackProgress> {
  const fallback: PlaybackProgress = { isInProgress: false, positionTicks: 0, positionPercent: null };
  if (!itemId) {
    return Promise.resolve(fallback);
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  const contextKey = getApiContextKey(apiClient, userId);
  if (!apiClient || !userId || !contextKey) {
    return Promise.resolve(fallback);
  }

  const cacheKey = getScopedPreviewCacheKey(contextKey, itemId);
  const cached = playbackProgressCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const request = requestJson<JellyfinItem>(`Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`, {
    Fields: 'RunTimeTicks',
    EnableUserData: true
  })
    .then(resolvePlaybackProgress)
    .catch((error) => {
      playbackProgressCache.delete(cacheKey);
      debugLog('Failed to resolve playback progress for preview selection.', itemId, error);
      return fallback;
    });

  playbackProgressCache.set(cacheKey, {
    expiresAt: Date.now() + PLAYBACK_PROGRESS_CACHE_MS,
    value: request
  });
  return request;
}
