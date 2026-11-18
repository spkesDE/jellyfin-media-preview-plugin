import { getApiContextKey, getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import { ancestorLibraryCache, getScopedPreviewCacheKey, libraryIdCache } from '../core/storage';
import { SUPPORTED_TYPES } from '../constants';
import type { JellyfinItem } from '../types/jellyfin';
import { peekBatchedItem } from './itemBatch';

/** Ancestors above the libraries; they are shared by every item and say nothing about one library. */
const ROOT_FOLDER_TYPES = new Set(['UserRootFolder', 'AggregateFolder']);

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

function findConfiguredLibraryId(libraryId: string | null | undefined, configuredLibraryIds: string[]): string | null {
  const normalized = normalizeLibraryId(libraryId);
  if (!normalized) {
    return null;
  }

  return configuredLibraryIds.map((id) => id.trim()).find((id) => normalizeLibraryId(id) === normalized) || null;
}

function readRouteQuery(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const queryStart = hash.indexOf('?');
  if (queryStart >= 0) {
    new URLSearchParams(hash.slice(queryStart + 1)).forEach((value, key) => params.set(key, value));
  }

  return params;
}

/**
 * The library a card belongs to when the current route names it. On library pages
 * (`#/movies?topParentId=…`, `#/tv?topParentId=…`) every media card is from that library.
 * `parentId` (`#/list?parentId=…`) can be a sub-folder, so it only counts when it is one of
 * the configured libraries itself.
 *
 * Returns `undefined` when the route does not decide it, `null` when the route's library has
 * no rule, or the configured library id.
 */
export function getRouteLibraryId(configuredLibraryIds: string[], itemType?: string | null): string | null | undefined {
  if (itemType && !SUPPORTED_TYPES.has(itemType)) {
    return undefined;
  }

  const params = readRouteQuery();
  const topParentId = params.get('topParentId') || params.get('topparentid');
  if (topParentId) {
    return findConfiguredLibraryId(topParentId, configuredLibraryIds);
  }

  const parentId = params.get('parentId') || params.get('parentid');
  const configuredParent = findConfiguredLibraryId(parentId, configuredLibraryIds);
  return configuredParent || undefined;
}

function getLibraryRuleKey(configuredLibraryIds: string[]): string {
  return Array.from(new Set(configuredLibraryIds.map(normalizeLibraryId).filter((libraryId) => !!libraryId)))
    .sort()
    .join(',');
}

function getAncestorCacheKey(contextKey: string, ancestorId: string, libraryRuleKey: string): string {
  return `${getScopedPreviewCacheKey(contextKey, normalizeLibraryId(ancestorId))}\u001f${libraryRuleKey}`;
}

/**
 * The ancestors whose library is known once one of their descendants was resolved: every
 * folder, season and series below the library roots. Without folder types, only the
 * ancestors up to the matched library (or just the direct parent) are safe to share.
 */
export function getShareableAncestors(ancestors: JellyfinItem[], matchedLibraryId: string | null): JellyfinItem[] {
  const hasTypes = ancestors.some((ancestor) => !!ancestor?.Type);
  if (hasTypes) {
    const rootIndex = ancestors.findIndex((ancestor) => ROOT_FOLDER_TYPES.has(ancestor?.Type || ''));
    return rootIndex >= 0 ? ancestors.slice(0, rootIndex) : ancestors;
  }

  if (matchedLibraryId) {
    const matchedIndex = ancestors.findIndex(
      (ancestor) => normalizeLibraryId(ancestor?.Id) === normalizeLibraryId(matchedLibraryId)
    );
    if (matchedIndex >= 0) {
      return ancestors.slice(0, matchedIndex + 1);
    }
  }

  return ancestors.slice(0, 1);
}

function rememberAncestorLibraries(
  contextKey: string,
  libraryRuleKey: string,
  ancestors: JellyfinItem[],
  libraryId: string | null
): void {
  getShareableAncestors(ancestors, libraryId).forEach((ancestor) => {
    if (ancestor?.Id) {
      ancestorLibraryCache.set(getAncestorCacheKey(contextKey, ancestor.Id, libraryRuleKey), libraryId);
    }
  });
}

/** A sibling already resolved the item's parent, season or series: reuse its library. */
function findSiblingLibraryId(
  contextKey: string,
  itemId: string,
  libraryRuleKey: string
): { libraryId: string | null } | null {
  const item = peekBatchedItem(itemId);
  const parentIds = [item?.ParentId, item?.SeasonId, item?.SeriesId].filter((id): id is string => !!id);
  for (const parentId of parentIds) {
    const key = getAncestorCacheKey(contextKey, parentId, libraryRuleKey);
    if (ancestorLibraryCache.has(key)) {
      return { libraryId: ancestorLibraryCache.get(key) ?? null };
    }
  }

  return null;
}

export function getLibraryIdForItem(
  itemId: string | null | undefined,
  configuredLibraryIds: string[],
  itemType?: string | null
): Promise<string | null> {
  if (!itemId || !configuredLibraryIds.length) {
    return Promise.resolve(null);
  }

  const routeLibraryId = getRouteLibraryId(configuredLibraryIds, itemType);
  if (routeLibraryId !== undefined) {
    return Promise.resolve(routeLibraryId);
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  const contextKey = getApiContextKey(apiClient, userId);
  if (!apiClient || !userId || !contextKey) {
    return Promise.resolve(null);
  }
  const libraryRuleKey = getLibraryRuleKey(configuredLibraryIds);
  const cacheKey = `${getScopedPreviewCacheKey(contextKey, itemId)}\u001f${libraryRuleKey}`;

  if (libraryIdCache.has(cacheKey)) {
    return libraryIdCache.get(cacheKey)!;
  }

  const sibling = findSiblingLibraryId(contextKey, itemId, libraryRuleKey);
  if (sibling) {
    const resolved = Promise.resolve(sibling.libraryId);
    libraryIdCache.set(cacheKey, resolved);
    return resolved;
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

      rememberAncestorLibraries(contextKey, libraryRuleKey, ancestors, libraryId);
      return libraryId;
    })
    .catch((error) => {
      // Only failed lookups are retried; "no rule for this library" is a valid, cached answer.
      debugLog('Failed to resolve library ancestors for item.', itemId, error);
      libraryIdCache.delete(cacheKey);
      return null;
    });

  libraryIdCache.set(cacheKey, request);
  return request;
}
