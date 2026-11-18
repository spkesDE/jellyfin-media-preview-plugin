import { getApiContextKey, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import { batchedItemCache, getScopedPreviewCacheKey } from '../core/storage';
import type { JellyfinItem, JellyfinItemsResult } from '../types/jellyfin';

/** Collects item ids for this long before one request is sent for all of them. */
export const ITEM_BATCH_DEBOUNCE_MS = 150;
/** Upper bound of ids per request, so the query string stays well below URL length limits. */
export const ITEM_BATCH_SIZE = 50;
/** Same lifetime as the playback progress cache: the batch also carries the resume position. */
export const BATCHED_ITEM_TTL_MS = 30_000;
/** Everything the preview needs before a hover: Trickplay manifest, progress, runtime and parent. */
export const ITEM_BATCH_FIELDS = 'Trickplay,MediaSources,RunTimeTicks,ParentId';

interface PendingBatchItem {
  itemId: string;
  cacheKey: string;
  resolve: (item: JellyfinItem | null) => void;
}

interface PendingBatch {
  contextKey: string;
  userId: string;
  items: PendingBatchItem[];
}

let pendingBatch: PendingBatch | null = null;
let batchTimer: number | null = null;

function getRequestContext(): { contextKey: string; userId: string } | null {
  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  const contextKey = getApiContextKey(apiClient, userId);
  return apiClient && userId && contextKey ? { contextKey, userId } : null;
}

function getFreshEntry(cacheKey: string) {
  const entry = batchedItemCache.get(cacheKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    batchedItemCache.delete(cacheKey);
    return null;
  }

  return entry;
}

/**
 * The batched item for a scoped cache key: the in-flight promise while its batch is pending,
 * or the loaded item while it is fresh. Null when no batch covers the item, so the caller
 * sends its own request.
 */
export function getBatchedItem(cacheKey: string): Promise<JellyfinItem | null> | null {
  return getFreshEntry(cacheKey)?.value || null;
}

/** The loaded item without waiting, for lookups that only need hints such as the parent id. */
export function peekBatchedItem(itemId: string | null | undefined): JellyfinItem | null {
  const context = getRequestContext();
  if (!itemId || !context) {
    return null;
  }

  return getFreshEntry(getScopedPreviewCacheKey(context.contextKey, itemId))?.item || null;
}

function sendBatch(batch: PendingBatch): void {
  const current = getRequestContext();
  if (!current || current.contextKey !== batch.contextKey) {
    // The user or server changed while the ids were collected; the cache was already reset.
    batch.items.forEach((entry) => entry.resolve(null));
    return;
  }

  for (let start = 0; start < batch.items.length; start += ITEM_BATCH_SIZE) {
    const chunk = batch.items.slice(start, start + ITEM_BATCH_SIZE);
    requestJson<JellyfinItemsResult>(`Users/${encodeURIComponent(batch.userId)}/Items`, {
      Ids: chunk.map((entry) => entry.itemId).join(','),
      Fields: ITEM_BATCH_FIELDS,
      EnableUserData: true
    })
      .then((result) => {
        const itemsById = new Map<string, JellyfinItem>();
        (Array.isArray(result?.Items) ? result.Items : []).forEach((item) => {
          if (item?.Id) {
            itemsById.set(item.Id.toLowerCase(), item);
          }
        });

        const expiresAt = Date.now() + BATCHED_ITEM_TTL_MS;
        chunk.forEach((entry) => {
          const item = itemsById.get(entry.itemId.toLowerCase()) || null;
          const cached = batchedItemCache.get(entry.cacheKey);
          if (item && cached) {
            cached.item = item;
            cached.expiresAt = expiresAt;
          } else {
            // Missing from the response: let the single-item request decide on hover.
            batchedItemCache.delete(entry.cacheKey);
          }

          entry.resolve(item);
        });
      })
      .catch((error) => {
        debugLog('Batched item request failed; items fall back to single requests.', error);
        chunk.forEach((entry) => {
          batchedItemCache.delete(entry.cacheKey);
          entry.resolve(null);
        });
      });
  }
}

/** Sends the collected ids now instead of waiting for the debounce. */
export function flushItemBatch(): void {
  if (batchTimer !== null) {
    window.clearTimeout(batchTimer);
    batchTimer = null;
  }

  const batch = pendingBatch;
  pendingBatch = null;
  if (batch?.items.length) {
    sendBatch(batch);
  }
}

/**
 * Loads several items with one `Users/{userId}/Items?Ids=…` request per batch. Ids that are
 * already loaded or in flight are not requested again. Resolves once every item is known;
 * an item that could not be loaded resolves to null.
 */
export function loadItemsBatched(itemIds: Array<string | null | undefined>): Promise<Map<string, JellyfinItem | null>> {
  const context = getRequestContext();
  const uniqueIds = Array.from(new Set(itemIds.filter((itemId): itemId is string => !!itemId)));
  if (!context || !uniqueIds.length) {
    return Promise.resolve(new Map());
  }

  if (pendingBatch && pendingBatch.contextKey !== context.contextKey) {
    flushItemBatch();
  }

  const requests = uniqueIds.map((itemId) => {
    const cacheKey = getScopedPreviewCacheKey(context.contextKey, itemId);
    const existing = getBatchedItem(cacheKey);
    if (existing) {
      return existing.then((item) => [itemId, item] as const);
    }

    let resolve: (item: JellyfinItem | null) => void = () => undefined;
    const value = new Promise<JellyfinItem | null>((done) => {
      resolve = done;
    });
    batchedItemCache.set(cacheKey, { expiresAt: Date.now() + BATCHED_ITEM_TTL_MS, value });
    if (!pendingBatch) {
      pendingBatch = { ...context, items: [] };
    }

    pendingBatch.items.push({ itemId, cacheKey, resolve });
    return value.then((item) => [itemId, item] as const);
  });

  if (pendingBatch?.items.length && batchTimer === null) {
    batchTimer = window.setTimeout(flushItemBatch, ITEM_BATCH_DEBOUNCE_MS);
  }

  return Promise.all(requests).then((entries) => new Map(entries));
}

/** Drops ids that were collected but not sent yet. Loaded items stay cached. */
export function cancelPendingItemBatch(): void {
  if (batchTimer !== null) {
    window.clearTimeout(batchTimer);
    batchTimer = null;
  }

  const batch = pendingBatch;
  pendingBatch = null;
  batch?.items.forEach((entry) => {
    batchedItemCache.delete(entry.cacheKey);
    entry.resolve(null);
  });
}
