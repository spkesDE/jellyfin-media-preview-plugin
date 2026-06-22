import { buildApiUrl } from '../core/apiClient';
import { tilePreloadCache } from '../core/storage';
import { config } from '../config';
import {
  PREVIEW_SOURCE_PREFER_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_TRICKPLAY
} from '../constants';
import { clamp } from '../core/dom';
import { debugLog } from '../core/logger';
import { getLibraryIdForItem } from './library';
import { getContentTypePreviewSource, getResolvedPreviewSource } from './source';
import { getTrickplayPreview } from './trickplay';
import { runtimeState } from '../runtime';
import type { TrickplayPreview } from '../types/preview';

interface TrickplayPreloadRequest {
  itemId: string;
  itemType: string | null | undefined;
  percent: number;
}

const trickplayPreloadQueue: TrickplayPreloadRequest[] = [];
const trickplayPreloadCache = new Set<string>();
const trickplayPreloadCards = new WeakMap<Element, TrickplayPreloadRequest>();
const trickplayPreloadTimers = new WeakMap<Element, number>();
let activeTrickplayPreloads = 0;
let trickplayPreloadTimer: number | null = null;
const trickplayPreloadIntentDelayMs = 150;

function getMaxConcurrentTrickplayPreloads(): number {
  return Math.max(1, Math.floor(Number(config.trickplayPreloadLimit) || 2));
}

function previewSourceUsesTrickplay(source: string): boolean {
  return source === PREVIEW_SOURCE_TRICKPLAY
    || source === PREVIEW_SOURCE_PREFER_TRICKPLAY
    || source === PREVIEW_SOURCE_PREFER_TRAILER;
}

function getPreloadPreviewSource(itemId: string, itemType?: string | null): Promise<string> {
  if (!config.libraryPreviewSourceOverrides.length) {
    return Promise.resolve(getContentTypePreviewSource(itemType));
  }

  return getLibraryIdForItem(itemId).then((libraryId) => getResolvedPreviewSource(itemType, libraryId));
}

function scheduleTrickplayPreloadQueue(): void {
  if (trickplayPreloadTimer !== null) {
    return;
  }

  trickplayPreloadTimer = window.setTimeout(() => {
    trickplayPreloadTimer = null;
    processTrickplayPreloadQueue();
  }, 25);
}

function processTrickplayPreloadQueue(): void {
  const maxConcurrentTrickplayPreloads = getMaxConcurrentTrickplayPreloads();
  while (activeTrickplayPreloads < maxConcurrentTrickplayPreloads && trickplayPreloadQueue.length) {
    const request = trickplayPreloadQueue.shift();
    if (!request) {
      continue;
    }

    activeTrickplayPreloads += 1;
    getPreloadPreviewSource(request.itemId, request.itemType)
      .then((previewSource) => {
        if (!previewSourceUsesTrickplay(previewSource)) {
          return null;
        }

        return getTrickplayPreview(request.itemId, request.percent);
      })
      .then((preview) => {
        preloadTileUrls(preview);
      })
      .catch((error) => {
        debugLog('Trickplay preload failed.', request.itemId, error);
      })
      .finally(() => {
        activeTrickplayPreloads = Math.max(0, activeTrickplayPreloads - 1);
        if (trickplayPreloadQueue.length) {
          scheduleTrickplayPreloadQueue();
        }
      });
  }
}

export function queueTrickplayPreload(
  itemId: string | null | undefined,
  percent: number,
  itemType?: string | null
): void {
  if (!config.trickplayPreloadEnabled || !itemId) {
    return;
  }

  const normalizedPercent = clamp(Number(percent) || 0, 0, 1);
  const percentBucket = Math.round(normalizedPercent * 20);
  const preloadKey = `${itemId}|${itemType || ''}|${percentBucket}`;
  if (trickplayPreloadCache.has(preloadKey)) {
    return;
  }

  trickplayPreloadCache.add(preloadKey);
  trickplayPreloadQueue.push({
    itemId,
    itemType,
    percent: percentBucket / 20
  });
  scheduleTrickplayPreloadQueue();
}

export function scheduleTrickplayPreload(
  card: HTMLElement,
  itemId: string | null | undefined,
  percent: number,
  itemType?: string | null
): void {
  if (!config.trickplayPreloadEnabled || !itemId) {
    return;
  }

  cancelScheduledTrickplayPreload(card);
  const timer = window.setTimeout(() => {
    trickplayPreloadTimers.delete(card);
    queueTrickplayPreload(itemId, percent, itemType);
  }, trickplayPreloadIntentDelayMs);
  trickplayPreloadTimers.set(card, timer);
}

export function cancelScheduledTrickplayPreload(card: HTMLElement): void {
  const timer = trickplayPreloadTimers.get(card);
  if (timer === undefined) {
    return;
  }

  window.clearTimeout(timer);
  trickplayPreloadTimers.delete(card);
}

function getTrickplayPreloadObserver(): IntersectionObserver | null {
  if (!('IntersectionObserver' in window)) {
    return null;
  }

  if (!runtimeState.trickplayPreloadObserver) {
    runtimeState.trickplayPreloadObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        runtimeState.trickplayPreloadObserver?.unobserve(entry.target);
        const request = trickplayPreloadCards.get(entry.target);
        if (!request) {
          return;
        }

        queueTrickplayPreload(request.itemId, request.percent, request.itemType);
      });
    }, {
      root: null,
      rootMargin: '600px 0px',
      threshold: 0.01
    });
  }

  return runtimeState.trickplayPreloadObserver;
}

export function observeTrickplayPreload(
  card: HTMLElement,
  itemId: string | null | undefined,
  percent: number,
  itemType?: string | null
): void {
  if (!config.trickplayPreloadEnabled || !itemId) {
    return;
  }

  const request = {
    itemId,
    itemType,
    percent
  };
  const observer = getTrickplayPreloadObserver();
  if (!observer) {
    queueTrickplayPreload(itemId, percent, itemType);
    return;
  }

  trickplayPreloadCards.set(card, request);
  observer.observe(card);
}

export function disconnectTrickplayPreloadObserver(): void {
  if (runtimeState.trickplayPreloadObserver) {
    runtimeState.trickplayPreloadObserver.disconnect();
    runtimeState.trickplayPreloadObserver = null;
  }
}

export function preloadTileUrls(preview: TrickplayPreview | null | undefined): void {
  if (!preview?.info) {
    return;
  }

  const indexes = [preview.tileIndex - 1, preview.tileIndex, preview.tileIndex + 1].filter((index) => {
    const maxTileIndex = Math.ceil(preview.info.thumbnailCount / preview.info.totalFramesPerTile) - 1;
    return index >= 0 && index <= maxTileIndex;
  });

  indexes.forEach((tileIndex) => {
    const preloadUrl = buildApiUrl(
      `Videos/${encodeURIComponent(preview.info.itemId)}/Trickplay/${encodeURIComponent(preview.info.width)}/${encodeURIComponent(tileIndex)}.jpg`,
      preview.info.mediaSourceId ? { mediaSourceId: preview.info.mediaSourceId } : undefined
    );

    if (!preloadUrl || tilePreloadCache.has(preloadUrl)) {
      return;
    }

    tilePreloadCache.add(preloadUrl);
    const image = new Image();
    image.src = preloadUrl;
  });
}
