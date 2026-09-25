import { getApiContextKey, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import { getScopedPreviewCacheKey, libraryIdCache } from '../core/storage';
import type { JellyfinItem } from '../types/jellyfin';

export function getLibraryIdForItem(itemId: string | null | undefined): Promise<string | null> {
  if (!itemId) {
    return Promise.resolve(null);
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  const contextKey = getApiContextKey(apiClient, userId);
  if (!apiClient || !userId || !contextKey) {
    return Promise.resolve(null);
  }
  const cacheKey = getScopedPreviewCacheKey(contextKey, itemId);

  if (libraryIdCache.has(cacheKey)) {
    return libraryIdCache.get(cacheKey)!;
  }

  const request = requestJson<JellyfinItem[]>(`Items/${encodeURIComponent(itemId)}/Ancestors`)
    .then((ancestors) => {
      if (!Array.isArray(ancestors) || !ancestors.length) {
        return null;
      }

      const library = ancestors[ancestors.length - 1];
      return library?.Id || null;
    })
    .catch((error) => {
      debugLog('Failed to resolve library ancestors for item.', itemId, error);
      libraryIdCache.delete(cacheKey);
      return null;
    });

  libraryIdCache.set(cacheKey, request);
  return request.then((libraryId) => {
    if (!libraryId) {
      libraryIdCache.delete(cacheKey);
    }

    return libraryId;
  });
}
