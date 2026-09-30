import { config } from '../config';
import {
  PREVIEW_SOURCE_TRICKPLAY,
  SUPPORTED_TYPES,
  VALID_AUTO_SCRUB_PRESETS,
  AUTO_SCRUB_PRESET_BALANCED,
  AUTO_SCRUB_PRESET_SNAPPY,
  AUTO_SCRUB_PRESET_CINEMATIC,
  AUTO_SCRUB_PRESET_CUSTOM
} from '../constants';
import { buildApiUrl, getApiContextKey, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { clamp } from '../core/dom';
import { debugLog } from '../core/logger';
import { getScopedPreviewCacheKey, itemInfoCache, missingTrickplayCache } from '../core/storage';
import { requestJson } from '../core/request';
import type { JellyfinItem, JellyfinItemsResult, JellyfinTrickplayManifest } from '../types/jellyfin';
import type { TrickplayInfo, TrickplayPreview } from '../types/preview';

const missingTrickplayCacheCooldownMs = 10 * 60 * 1000;
const trickplayEpisodeContainerTypes = new Set(['Series', 'Season']);
const trickplayEpisodeLookupLimit = 10;

function isMissingTrickplayCached(cacheKey: string): boolean {
  const cachedAt = missingTrickplayCache.get(cacheKey);
  if (!cachedAt) {
    return false;
  }

  if (Date.now() - cachedAt < missingTrickplayCacheCooldownMs) {
    return true;
  }

  missingTrickplayCache.delete(cacheKey);
  return false;
}

export function getTrickplayFrameIndex(
  info: TrickplayInfo | null | undefined,
  percent: number | null | undefined
): number {
  if (!info || !info.thumbnailCount) {
    return 0;
  }

  const normalizedPercent = Math.max(0, Math.min(1, Number(percent) || 0));
  return Math.min(
    info.thumbnailCount - 1,
    Math.max(0, Math.round(normalizedPercent * Math.max(0, info.thumbnailCount - 1)))
  );
}

export function getAdaptiveTrickplayFrameHoldMs(info: TrickplayInfo | null | undefined): number {
  const frameCount = Math.max(1, Number(info?.thumbnailCount) || 0);
  const intervalMs = Math.max(0, Number(info?.intervalMs) || 0);

  if (frameCount <= 2 || intervalMs >= 15000) {
    return 240;
  }

  if (frameCount <= 6 || intervalMs >= 10000) {
    return 180;
  }

  if (frameCount <= 12 || intervalMs >= 5000) {
    return 130;
  }

  if (frameCount <= 40 || intervalMs >= 2500) {
    return 80;
  }

  return 32;
}

export function getAutoScrubTimingProfile(): {
  minDelayMs: number;
  maxDelayMs: number;
  plannedDurationMs: number;
} {
  const preset = VALID_AUTO_SCRUB_PRESETS.has(config.autoScrubPreset)
    ? config.autoScrubPreset
    : AUTO_SCRUB_PRESET_BALANCED;

  switch (preset) {
    case AUTO_SCRUB_PRESET_SNAPPY:
      return {
        minDelayMs: 24,
        maxDelayMs: 120,
        plannedDurationMs: 1800
      };
    case AUTO_SCRUB_PRESET_CINEMATIC:
      return {
        minDelayMs: 180,
        maxDelayMs: 1400,
        plannedDurationMs: 14000
      };
    case AUTO_SCRUB_PRESET_CUSTOM:
      return {
        minDelayMs: Math.max(16, Number(config.autoScrubMinDelayMs) || 40),
        maxDelayMs: Math.max(
          Math.max(16, Number(config.autoScrubMinDelayMs) || 40),
          Number(config.autoScrubMaxDelayMs) || 1000
        ),
        plannedDurationMs: Math.max(500, Number(config.autoScrubDurationMs) || 4000)
      };
    case AUTO_SCRUB_PRESET_BALANCED:
    default:
      return {
        minDelayMs: 60,
        maxDelayMs: 520,
        plannedDurationMs: 6500
      };
  }
}

export function clampAdaptiveDelay(delayMs: number): number {
  const profile = getAutoScrubTimingProfile();
  const minDelayMs = profile.minDelayMs;
  const maxDelayMs = Math.max(minDelayMs, profile.maxDelayMs);
  const safeDelayMs = Math.max(0, Number(delayMs) || 0);

  if (safeDelayMs > maxDelayMs) {
    return maxDelayMs;
  }

  if (safeDelayMs < minDelayMs) {
    return minDelayMs;
  }

  return safeDelayMs;
}

export function getEffectiveAutoScrubDurationMs(): number {
  const profile = getAutoScrubTimingProfile();
  return Math.max(500, profile.plannedDurationMs);
}

export function getAutoScrubFrameCount(info: TrickplayInfo | null | undefined): number {
  return info?.thumbnailCount ? Math.max(2, Number(info.thumbnailCount)) : 20;
}

export function getClampedAutoScrubStepDelayMs(info: TrickplayInfo | null | undefined): number {
  const frameCount = getAutoScrubFrameCount(info);
  const durationDerivedDelayMs = Math.round(getEffectiveAutoScrubDurationMs() / Math.max(1, frameCount - 1));
  return clampAdaptiveDelay(durationDerivedDelayMs);
}

export function getEffectiveSmoothAutoScrubDurationMs(info: TrickplayInfo | null | undefined): number {
  const frameCount = getAutoScrubFrameCount(info);
  return Math.max(500, getClampedAutoScrubStepDelayMs(info) * Math.max(1, frameCount - 1));
}

export function normalizeTrickplayManifest(item: JellyfinItem | null | undefined): TrickplayInfo | null {
  if (!item?.Trickplay) {
    return null;
  }

  const widthKeys = Object.keys(item.Trickplay).filter((key) => !!item.Trickplay?.[key]);
  if (!widthKeys.length) {
    return null;
  }

  const selectedWidthKey = widthKeys.sort((left, right) => {
    return Math.abs(Number(left) - config.trickplayWidth) - Math.abs(Number(right) - config.trickplayWidth);
  })[0];

  const widthBucket = item.Trickplay[selectedWidthKey];
  const mediaSources = Array.isArray(item.MediaSources) ? item.MediaSources : [];
  const mediaSourceIds = mediaSources.map((source) => source?.Id).filter(Boolean) as string[];
  const manifestKeys = Object.keys(widthBucket || {});
  const selectedManifestKey =
    mediaSourceIds.find((id) => Object.prototype.hasOwnProperty.call(widthBucket, id)) || manifestKeys[0];
  const trickplayInfo = widthBucket?.[selectedManifestKey] as JellyfinTrickplayManifest | undefined;

  if (!trickplayInfo?.Width || !trickplayInfo.TileWidth || !trickplayInfo.TileHeight || !trickplayInfo.ThumbnailCount) {
    return null;
  }

  return {
    itemId: item.Id || '',
    mediaSourceId: mediaSourceIds.includes(selectedManifestKey) ? selectedManifestKey : mediaSources[0]?.Id || null,
    width: Number(selectedWidthKey) || trickplayInfo.Width,
    manifestKey: selectedManifestKey,
    frameWidth: trickplayInfo.Width,
    frameHeight: trickplayInfo.Height || Math.round((trickplayInfo.Width * 9) / 16),
    tilesPerRow: trickplayInfo.TileWidth,
    tilesPerColumn: trickplayInfo.TileHeight,
    thumbnailCount: trickplayInfo.ThumbnailCount,
    intervalMs: trickplayInfo.Interval || 0,
    totalFramesPerTile: trickplayInfo.TileWidth * trickplayInfo.TileHeight,
    type: item.Type
  };
}

function pickEpisodeWithTrickplay(episodes: JellyfinItem[] | null | undefined): JellyfinItem | null {
  if (!Array.isArray(episodes)) {
    return null;
  }

  return episodes.find((episode) => !!normalizeTrickplayManifest(episode)) || null;
}

function fetchNextUpEpisode(seriesId: string, userId: string): Promise<JellyfinItem | null> {
  return requestJson<JellyfinItemsResult>('Shows/NextUp', {
    UserId: userId,
    SeriesId: seriesId,
    Limit: trickplayEpisodeLookupLimit,
    Fields: 'Trickplay,MediaSources'
  })
    .then((result) => pickEpisodeWithTrickplay(result?.Items))
    .catch((error) => {
      debugLog('Failed to load Next Up episode for trickplay resolution.', seriesId, error);
      return null;
    });
}

function fetchChildEpisode(containerId: string, userId: string): Promise<JellyfinItem | null> {
  return requestJson<JellyfinItemsResult>('Items', {
    UserId: userId,
    ParentId: containerId,
    Recursive: true,
    IncludeItemTypes: 'Episode',
    IsMissing: false,
    SortBy: 'SortName',
    SortOrder: 'Ascending',
    Limit: trickplayEpisodeLookupLimit,
    Fields: 'Trickplay,MediaSources'
  })
    .then((result) => pickEpisodeWithTrickplay(result?.Items))
    .catch((error) => {
      debugLog('Failed to load episodes for trickplay resolution.', containerId, error);
      return null;
    });
}

// Series and Season items do not carry trickplay themselves; preview one of their episodes instead.
function resolveTrickplayItem(item: JellyfinItem, userId: string): Promise<JellyfinItem> {
  const itemType = item.Type || '';
  const containerId = item.Id;
  if (!containerId || !trickplayEpisodeContainerTypes.has(itemType)) {
    return Promise.resolve(item);
  }

  const nextUpRequest = itemType === 'Series' ? fetchNextUpEpisode(containerId, userId) : Promise.resolve(null);

  return nextUpRequest.then((nextUpEpisode) => {
    if (nextUpEpisode) {
      return nextUpEpisode;
    }

    // Fall back to the first episode that has a usable trickplay manifest.
    return fetchChildEpisode(containerId, userId).then((firstEpisode) => firstEpisode || item);
  });
}

export function getTrickplayInfo(itemId: string | null | undefined): Promise<TrickplayInfo | null> {
  if (!itemId) {
    return Promise.resolve(null);
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  const contextKey = getApiContextKey(apiClient, userId);
  if (!apiClient || !userId || !contextKey) {
    debugLog('Skipping trickplay fetch because ApiClient or user id is missing.', itemId);
    return Promise.resolve(null);
  }
  const cacheKey = getScopedPreviewCacheKey(contextKey, itemId);

  if (isMissingTrickplayCached(cacheKey)) {
    debugLog('Skipping trickplay fetch because a recent lookup found no usable manifest.', itemId);
    return Promise.resolve(null);
  }

  if (itemInfoCache.has(cacheKey)) {
    return itemInfoCache.get(cacheKey)!;
  }

  const request = requestJson<JellyfinItem>(`Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`, {
    Fields: 'Trickplay,MediaSources'
  })
    .then((item) => {
      if (!item || !SUPPORTED_TYPES.has(item.Type || '')) {
        debugLog('Item is unsupported or missing.', {
          itemId,
          type: item?.Type
        });
        return null;
      }

      return resolveTrickplayItem(item, userId).then((resolvedItem) => {
        const normalized = normalizeTrickplayManifest(resolvedItem);
        if (!normalized) {
          debugLog('No usable trickplay manifest found for item.', {
            itemId,
            type: resolvedItem.Type,
            trickplayKeys: resolvedItem.Trickplay ? Object.keys(resolvedItem.Trickplay) : []
          });
          return null;
        }

        debugLog('Resolved trickplay info.', normalized);
        missingTrickplayCache.delete(cacheKey);
        return normalized;
      });
    })
    .catch((error) => {
      debugLog('Failed to load trickplay metadata for item.', itemId, error);
      itemInfoCache.delete(cacheKey);
      missingTrickplayCache.set(cacheKey, Date.now());
      return null;
    });

  itemInfoCache.set(cacheKey, request);
  return request.then((result) => {
    if (!result) {
      itemInfoCache.delete(cacheKey);
      missingTrickplayCache.set(cacheKey, Date.now());
    }

    return result;
  });
}

export function getTrickplayPreview(itemId: string, percent: number): Promise<TrickplayPreview | null> {
  return getTrickplayInfo(itemId).then((info) => {
    if (!info) {
      return null;
    }

    const normalizedPercent = clamp(Number(percent) || 0, 0, 1);
    const frameIndex = getTrickplayFrameIndex(info, normalizedPercent);
    const tileIndex = Math.floor(frameIndex / info.totalFramesPerTile);
    const frameIndexInTile = frameIndex % info.totalFramesPerTile;
    const frameColumn = frameIndexInTile % info.tilesPerRow;
    const frameRow = Math.floor(frameIndexInTile / info.tilesPerRow);
    const previewItemId = info.itemId || itemId;
    const tileUrl = buildApiUrl(
      `Videos/${encodeURIComponent(previewItemId)}/Trickplay/${encodeURIComponent(info.width)}/${encodeURIComponent(tileIndex)}.jpg`,
      info.mediaSourceId ? { mediaSourceId: info.mediaSourceId } : undefined
    );

    return {
      source: PREVIEW_SOURCE_TRICKPLAY,
      info,
      percent: normalizedPercent,
      frameIndex,
      tileIndex,
      tileUrl,
      frameColumn,
      frameRow
    };
  });
}
