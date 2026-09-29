import { getApiContextKey, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import { getScopedPreviewCacheKey, libraryIdCache } from '../core/storage';
import type { JellyfinItem } from '../types/jellyfin';

function normalizeLibraryId(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function resolveConfiguredLibraryId(
  ancestors: JellyfinItem[] | null | undefined,
  configuredLibraryIds: string[]
): string | null {
  if (!Array.isArray(ancestors) || !ancestors.length || !configuredLibraryIds.length) {
    return null;
  }

  const configuredIds = new Map(
    configuredLibraryIds
      .map((libraryId) => [normalizeLibraryId(libraryId), libraryId.trim()] as const)
      .filter(([normalizedLibraryId]) => !!normalizedLibraryId)
  );

  for (const ancestor of ancestors) {
    const configuredLibraryId = configuredIds.get(normalizeLibraryId(ancestor?.Id));
    if (configuredLibraryId) {
      return configuredLibraryId;
    }
  }

  return null;
}

export function getLibraryIdForItem(
  itemId: string | null | undefined,
  configuredLibraryIds: string[]
): Promise<string | null> {
  if (!itemId) {
    return Promise.resolve(null);
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  const contextKey = getApiContextKey(apiClient, userId);
  if (!apiClient || !userId || !contextKey) {
    return Promise.resolve(null);
  }
  const libraryRuleKey = Array.from(
    new Set(configuredLibraryIds.map(normalizeLibraryId).filter((libraryId) => !!libraryId))
  )
    .sort()
    .join(',');
  const cacheKey = `${getScopedPreviewCacheKey(contextKey, itemId)}\u001f${libraryRuleKey}`;

  if (libraryIdCache.has(cacheKey)) {
    return libraryIdCache.get(cacheKey)!;
  }

  const request = requestJson<JellyfinItem[]>(`Items/${encodeURIComponent(itemId)}/Ancestors`)
    .then((ancestors) => {
      if (!Array.isArray(ancestors) || !ancestors.length) {
        return null;
      }

      const libraryId = resolveConfiguredLibraryId(ancestors, configuredLibraryIds);
      if (!libraryId) {
        debugLog('No configured library rule matched the item ancestors.', {
          itemId,
          ancestorIds: ancestors.map((ancestor) => ancestor?.Id || null),
          configuredLibraryIds
        });
      }

      return libraryId;
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
