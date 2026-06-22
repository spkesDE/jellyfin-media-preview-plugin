import { config } from '../config';
import { PREVIEW_SOURCE_TRICKPLAY, SUPPORTED_TYPES, VALID_AUTO_SCRUB_PRESETS, AUTO_SCRUB_PRESET_BALANCED, AUTO_SCRUB_PRESET_SNAPPY, AUTO_SCRUB_PRESET_CINEMATIC, AUTO_SCRUB_PRESET_CUSTOM } from '../constants';
import { buildApiUrl, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { clamp } from '../core/dom';
import { debugLog } from '../core/logger';
import { itemInfoCache, missingTrickplayCache } from '../core/storage';
import { requestJson } from '../core/request';
import type { JellyfinItem, JellyfinTrickplayManifest } from '../types/jellyfin';
import type { TrickplayInfo, TrickplayPreview } from '../types/preview';

const missingTrickplayCacheCooldownMs = 10 * 60 * 1000;

function isMissingTrickplayCached(itemId: string): boolean {
  const cachedAt = missingTrickplayCache.get(itemId);
  if (!cachedAt) {
    return false;
  }

  if (Date.now() - cachedAt < missingTrickplayCacheCooldownMs) {
    return true;
  }

  missingTrickplayCache.delete(itemId);
  return false;
}

export function getTrickplayFrameIndex(info: TrickplayInfo | null | undefined, percent: number | null | undefined): number {
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
        maxDelayMs: Math.max(Math.max(16, Number(config.autoScrubMinDelayMs) || 40), Number(config.autoScrubMaxDelayMs) || 1000),
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
  const selectedManifestKey = mediaSourceIds.find((id) => Object.prototype.hasOwnProperty.call(widthBucket, id)) || manifestKeys[0];
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

export function getTrickplayInfo(itemId: string | null | undefined): Promise<TrickplayInfo | null> {
  if (!itemId) {
    return Promise.resolve(null);
  }

  if (isMissingTrickplayCached(itemId)) {
    debugLog('Skipping trickplay fetch because a recent lookup found no usable manifest.', itemId);
    return Promise.resolve(null);
  }

  if (itemInfoCache.has(itemId)) {
    return itemInfoCache.get(itemId)!;
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  if (!apiClient || !userId) {
    debugLog('Skipping trickplay fetch because ApiClient or user id is missing.', itemId);
    return Promise.resolve(null);
  }

  const request = requestJson<JellyfinItem>(`Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`, {
    Fields: 'Trickplay,MediaSources'
  }).then((item) => {
    if (!item || !SUPPORTED_TYPES.has(item.Type || '')) {
      debugLog('Item is unsupported or missing.', {
        itemId,
        type: item?.Type
      });
      return null;
    }

    const normalized = normalizeTrickplayManifest(item);
    if (!normalized) {
      debugLog('No usable trickplay manifest found for item.', {
        itemId,
        type: item.Type,
        trickplayKeys: item.Trickplay ? Object.keys(item.Trickplay) : []
      });
      return null;
    }

    debugLog('Resolved trickplay info.', normalized);
    missingTrickplayCache.delete(itemId);
    return normalized;
  }).catch((error) => {
    debugLog('Failed to load trickplay metadata for item.', itemId, error);
    itemInfoCache.delete(itemId);
    missingTrickplayCache.set(itemId, Date.now());
    return null;
  });

  itemInfoCache.set(itemId, request);
  return request.then((result) => {
    if (!result) {
      itemInfoCache.delete(itemId);
      missingTrickplayCache.set(itemId, Date.now());
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
    const tileUrl = buildApiUrl(
      `Videos/${encodeURIComponent(itemId)}/Trickplay/${encodeURIComponent(info.width)}/${encodeURIComponent(tileIndex)}.jpg`,
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
