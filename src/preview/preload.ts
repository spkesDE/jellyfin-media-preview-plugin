import { buildApiUrl, getApiContextKey, getGlobalApiClient } from '../core/apiClient';
import { tilePreloadCache } from '../core/storage';
import { config } from '../config';
import { isDataSaverActive } from '../core/userEnvironment';
import { clamp } from '../core/dom';
import { debugLog } from '../core/logger';
import { SUPPORTED_TYPES } from '../constants';
import { getPreviewSourceForItem, previewSourceUsesTrickplay } from './source';
import { getTrickplayPreview, trickplayEpisodeContainerTypes } from './trickplay';
import { cancelPendingItemBatch, flushItemBatch, loadItemsBatched } from './itemBatch';
import { runtimeState } from '../runtime';
import type { JellyfinItem } from '../types/jellyfin';
import type { TrickplayPreview } from '../types/preview';

interface TrickplayPreloadRequest {
  itemId: string;
  itemType: string | null | undefined;
  percent: number;
}

interface TrickplayPreloadQueueEntry extends TrickplayPreloadRequest {
  preloadKey: string;
  /** Set for cards preloaded because they are near the viewport, not because of hover intent. */
  card?: Element;
  /** The batched item for viewport preloads; null when the batch could not load it. */
  item?: Promise<JellyfinItem | null>;
}

/** Cards this far outside the viewport are preloaded too, about one row of a library grid. */
export const TRICKPLAY_PRELOAD_ROOT_MARGIN = '200px 0px';
/** Viewport preloads start once scrolling has rested this long, so fast scrolling loads nothing. */
export const TRICKPLAY_PRELOAD_SCROLL_IDLE_MS = 300;
const trickplayPreloadIntentDelayMs = 150;
const trickplayPreloadCacheLimit = 2000;

const trickplayPreloadQueue: TrickplayPreloadQueueEntry[] = [];
/** Preloads already started or queued. It outlives route changes, so returning to a page loads nothing again. */
const trickplayPreloadCache = new Set<string>();
const trickplayPreloadCards = new WeakMap<Element, TrickplayPreloadRequest>();
const trickplayPreloadTimers = new WeakMap<Element, number>();
const trickplayPreloadTimerIds = new Set<number>();
/** Cards inside the preload margin, waiting for scrolling to rest. */
const viewportCandidates = new Map<Element, TrickplayPreloadRequest>();
/** Viewport cards taken from the candidates and waiting in the queue. */
const queuedViewportCards = new Map<Element, TrickplayPreloadQueueEntry>();
let activeTrickplayPreloads = 0;
let trickplayPreloadTimer: number | null = null;
let trickplayPreloadGeneration = 0;
let scrollIdleTimer: number | null = null;
let scrollListenerBound = false;
let preloadContextKey: string | null = null;
let pageBudget: { routeKey: string; itemIds: Set<string> } = { routeKey: '', itemIds: new Set() };

function getContextKey(): string {
  return getApiContextKey(getGlobalApiClient()) || 'anonymous';
}

/** Preload keys belong to one user on one server; a switch starts over. */
function syncPreloadContext(): string {
  const contextKey = getContextKey();
  if (preloadContextKey !== contextKey) {
    trickplayPreloadCache.clear();
    preloadContextKey = contextKey;
  }

  return contextKey;
}

function getPreloadKey(itemId: string, itemType: string | null | undefined, percent: number): string {
  const percentBucket = Math.round(clamp(Number(percent) || 0, 0, 1) * 20);
  return `${syncPreloadContext()}|${itemId}|${itemType || ''}|${percentBucket}`;
}

function getPercentBucket(percent: number): number {
  return Math.round(clamp(Number(percent) || 0, 0, 1) * 20) / 20;
}

function addTrickplayPreloadCacheKey(key: string): void {
  while (trickplayPreloadCache.size >= trickplayPreloadCacheLimit) {
    const oldestKey = trickplayPreloadCache.values().next().value as string | undefined;
    if (oldestKey === undefined) {
      break;
    }
    trickplayPreloadCache.delete(oldestKey);
  }

  trickplayPreloadCache.add(key);
}

function getMaxConcurrentTrickplayPreloads(): number {
  return Math.max(1, Math.floor(Number(config.trickplayPreloadLimit) || 2));
}

function getRouteKey(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/** Cards that may be preloaded on the current page; 0 means no limit. */
function getRemainingPageBudget(): number {
  const routeKey = getRouteKey();
  if (pageBudget.routeKey !== routeKey) {
    pageBudget = { routeKey, itemIds: new Set() };
  }

  const maxCards = Math.max(0, Math.floor(Number(config.trickplayPreloadMaxCards) || 0));
  return maxCards === 0 ? Number.POSITIVE_INFINITY : Math.max(0, maxCards - pageBudget.itemIds.size);
}

function isPreloadAllowed(itemId: string | null | undefined): itemId is string {
  return !!config.trickplayPreloadEnabled && !!itemId && !isDataSaverActive();
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

/**
 * Viewport preloads only cover items that carry Trickplay themselves. Series and seasons
 * need Next Up and an episode lookup, which waits for hover intent.
 */
function preloadViewportItem(entry: TrickplayPreloadQueueEntry): Promise<TrickplayPreview | null> {
  return (entry.item || Promise.resolve(null)).then((item) => {
    const itemType = item?.Type || entry.itemType || '';
    if (!item || !SUPPORTED_TYPES.has(itemType) || trickplayEpisodeContainerTypes.has(itemType)) {
      return null;
    }

    return getPreviewSourceForItem(entry.itemId, itemType).then((previewSource) =>
      previewSourceUsesTrickplay(previewSource) ? getTrickplayPreview(entry.itemId, entry.percent) : null
    );
  });
}

function preloadIntentItem(entry: TrickplayPreloadQueueEntry): Promise<TrickplayPreview | null> {
  return getPreviewSourceForItem(entry.itemId, entry.itemType).then((previewSource) =>
    previewSourceUsesTrickplay(previewSource) ? getTrickplayPreview(entry.itemId, entry.percent) : null
  );
}

function processTrickplayPreloadQueue(): void {
  const maxConcurrentTrickplayPreloads = getMaxConcurrentTrickplayPreloads();
  while (activeTrickplayPreloads < maxConcurrentTrickplayPreloads && trickplayPreloadQueue.length) {
    const entry = trickplayPreloadQueue.shift();
    if (!entry) {
      continue;
    }

    if (entry.card) {
      queuedViewportCards.delete(entry.card);
      runtimeState.trickplayPreloadObserver?.unobserve(entry.card);
    }

    activeTrickplayPreloads += 1;
    const generation = trickplayPreloadGeneration;
    const isViewportPreload = !!entry.card;
    (isViewportPreload ? preloadViewportItem(entry) : preloadIntentItem(entry))
      .then((preview) => {
        if (generation === trickplayPreloadGeneration) {
          // The neighbouring tiles only matter once the pointer is on the card.
          preloadTileUrls(preview, { includeNeighbors: !isViewportPreload });
        }
      })
      .catch((error) => {
        debugLog('Trickplay preload failed.', entry.itemId, error);
      })
      .finally(() => {
        if (generation !== trickplayPreloadGeneration) {
          return;
        }

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
  if (!isPreloadAllowed(itemId)) {
    return;
  }

  const preloadKey = getPreloadKey(itemId, itemType, percent);
  if (trickplayPreloadCache.has(preloadKey)) {
    return;
  }

  addTrickplayPreloadCacheKey(preloadKey);
  trickplayPreloadQueue.push({
    itemId,
    itemType,
    percent: getPercentBucket(percent),
    preloadKey
  });
  scheduleTrickplayPreloadQueue();
}

export function scheduleTrickplayPreload(
  card: HTMLElement,
  itemId: string | null | undefined,
  percent: number,
  itemType?: string | null
): void {
  if (!isPreloadAllowed(itemId)) {
    return;
  }

  cancelScheduledTrickplayPreload(card);
  const timer = window.setTimeout(() => {
    trickplayPreloadTimerIds.delete(timer);
    trickplayPreloadTimers.delete(card);
    queueTrickplayPreload(itemId, percent, itemType);
  }, trickplayPreloadIntentDelayMs);
  trickplayPreloadTimers.set(card, timer);
  trickplayPreloadTimerIds.add(timer);
}

export function cancelScheduledTrickplayPreload(card: HTMLElement): void {
  const timer = trickplayPreloadTimers.get(card);
  if (timer === undefined) {
    return;
  }

  window.clearTimeout(timer);
  trickplayPreloadTimers.delete(card);
  trickplayPreloadTimerIds.delete(timer);
}

function scheduleViewportFlush(): void {
  if (scrollIdleTimer !== null) {
    window.clearTimeout(scrollIdleTimer);
  }

  scrollIdleTimer = window.setTimeout(() => {
    scrollIdleTimer = null;
    flushViewportCandidates();
  }, TRICKPLAY_PRELOAD_SCROLL_IDLE_MS);
}

function handleScroll(): void {
  if (viewportCandidates.size) {
    scheduleViewportFlush();
  }
}

function bindScrollListener(): void {
  if (!scrollListenerBound) {
    // Capture also sees scrolling inside Jellyfin's scroll containers, not only the document.
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    scrollListenerBound = true;
  }
}

function unbindScrollListener(): void {
  if (scrollListenerBound) {
    document.removeEventListener('scroll', handleScroll, { capture: true });
    scrollListenerBound = false;
  }
}

/** A card left the preload area before its preload started: take it out of the queue again. */
function dequeueViewportCard(card: Element): void {
  viewportCandidates.delete(card);
  const entry = queuedViewportCards.get(card);
  if (!entry) {
    return;
  }

  queuedViewportCards.delete(card);
  const index = trickplayPreloadQueue.indexOf(entry);
  if (index >= 0) {
    trickplayPreloadQueue.splice(index, 1);
  }

  trickplayPreloadCache.delete(entry.preloadKey);
  pageBudget.itemIds.delete(entry.itemId);
}

/**
 * Called once scrolling rests: takes the cards still near the viewport (up to the per-page
 * limit), loads their items in batched requests and queues the Trickplay preloads.
 */
function flushViewportCandidates(): void {
  if (!config.trickplayPreloadEnabled || isDataSaverActive()) {
    viewportCandidates.clear();
    return;
  }

  const taken: TrickplayPreloadQueueEntry[] = [];
  for (const [card, request] of Array.from(viewportCandidates.entries())) {
    const preloadKey = getPreloadKey(request.itemId, request.itemType, request.percent);
    if (!card.isConnected || trickplayPreloadCache.has(preloadKey)) {
      viewportCandidates.delete(card);
      runtimeState.trickplayPreloadObserver?.unobserve(card);
      continue;
    }

    if (getRemainingPageBudget() <= 0 && !pageBudget.itemIds.has(request.itemId)) {
      debugLog('Trickplay preload limit for this page reached.', { limit: config.trickplayPreloadMaxCards });
      viewportCandidates.clear();
      break;
    }

    viewportCandidates.delete(card);
    pageBudget.itemIds.add(request.itemId);
    addTrickplayPreloadCacheKey(preloadKey);
    const entry: TrickplayPreloadQueueEntry = {
      ...request,
      percent: getPercentBucket(request.percent),
      preloadKey,
      card
    };
    queuedViewportCards.set(card, entry);
    taken.push(entry);
  }

  if (!taken.length) {
    return;
  }

  const items = loadItemsBatched(taken.map((entry) => entry.itemId));
  // Scrolling already rested; send the batch now instead of waiting for its own debounce.
  flushItemBatch();
  taken.forEach((entry) => {
    entry.item = items.then((loaded) => loaded.get(entry.itemId) || null);
    trickplayPreloadQueue.push(entry);
  });
  scheduleTrickplayPreloadQueue();
}

function getTrickplayPreloadObserver(): IntersectionObserver | null {
  if (!('IntersectionObserver' in window)) {
    return null;
  }

  if (!runtimeState.trickplayPreloadObserver) {
    runtimeState.trickplayPreloadObserver = new IntersectionObserver(
      (entries) => {
        let added = false;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            dequeueViewportCard(entry.target);
            return;
          }

          const request = trickplayPreloadCards.get(entry.target);
          if (request && !queuedViewportCards.has(entry.target)) {
            viewportCandidates.set(entry.target, request);
            added = true;
          }
        });

        if (added) {
          scheduleViewportFlush();
        }
      },
      {
        root: null,
        rootMargin: TRICKPLAY_PRELOAD_ROOT_MARGIN,
        threshold: 0
      }
    );
    bindScrollListener();
  }

  return runtimeState.trickplayPreloadObserver;
}

export function observeTrickplayPreload(
  card: HTMLElement,
  itemId: string | null | undefined,
  percent: number,
  itemType?: string | null
): void {
  if (!isPreloadAllowed(itemId)) {
    return;
  }

  // Series and seasons are resolved on hover intent (Next Up), never for the whole grid.
  if (itemType && trickplayEpisodeContainerTypes.has(itemType)) {
    return;
  }

  // Without IntersectionObserver there is no cheap way to know what is visible; hover still preloads.
  const observer = getTrickplayPreloadObserver();
  if (!observer) {
    return;
  }

  trickplayPreloadCards.set(card, { itemId, itemType, percent });
  observer.observe(card);
}

export function disconnectTrickplayPreloadObserver(): void {
  if (runtimeState.trickplayPreloadObserver) {
    runtimeState.trickplayPreloadObserver.disconnect();
    runtimeState.trickplayPreloadObserver = null;
  }

  unbindScrollListener();
  if (scrollIdleTimer !== null) {
    window.clearTimeout(scrollIdleTimer);
    scrollIdleTimer = null;
  }

  viewportCandidates.clear();
}

/**
 * Stops pending preloads (queue, timers, the batch not sent yet) but keeps every cache, so a
 * page that is shown again does not load its items a second time.
 */
export function cancelTrickplayPreloads(): void {
  trickplayPreloadGeneration += 1;
  disconnectTrickplayPreloadObserver();

  if (trickplayPreloadTimer !== null) {
    window.clearTimeout(trickplayPreloadTimer);
    trickplayPreloadTimer = null;
  }

  trickplayPreloadTimerIds.forEach((timer) => window.clearTimeout(timer));
  trickplayPreloadTimerIds.clear();
  // Queued preloads never ran; forget their keys so they can be preloaded later.
  trickplayPreloadQueue.forEach((entry) => trickplayPreloadCache.delete(entry.preloadKey));
  trickplayPreloadQueue.length = 0;
  queuedViewportCards.clear();
  cancelPendingItemBatch();
  activeTrickplayPreloads = 0;
}

/** Full teardown (plugin destroyed): cancels everything and drops the preload bookkeeping. */
export function clearTrickplayPreloads(): void {
  cancelTrickplayPreloads();
  trickplayPreloadCache.clear();
  preloadContextKey = null;
  pageBudget = { routeKey: '', itemIds: new Set() };
}

export function preloadTileUrls(
  preview: TrickplayPreview | null | undefined,
  options: { includeNeighbors?: boolean } = {}
): void {
  if (!preview?.info) {
    return;
  }

  const includeNeighbors = options.includeNeighbors !== false;
  const maxTileIndex = Math.ceil(preview.info.thumbnailCount / preview.info.totalFramesPerTile) - 1;
  const candidates = includeNeighbors
    ? [preview.tileIndex - 1, preview.tileIndex, preview.tileIndex + 1]
    : [preview.tileIndex];
  const indexes = candidates.filter((index) => index >= 0 && index <= maxTileIndex);

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
