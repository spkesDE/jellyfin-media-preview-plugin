import { libraryIdCache } from '../core/storage';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import type { JellyfinItem } from '../types/jellyfin';

export function getLibraryIdForItem(itemId: string | null | undefined): Promise<string | null> {
  if (!itemId) {
    return Promise.resolve(null);
  }

  if (libraryIdCache.has(itemId)) {
    return libraryIdCache.get(itemId)!;
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
      libraryIdCache.delete(itemId);
      return null;
    });

  libraryIdCache.set(itemId, request);
  return request.then((libraryId) => {
    if (!libraryId) {
      libraryIdCache.delete(itemId);
    }

    return libraryId;
  });
}
