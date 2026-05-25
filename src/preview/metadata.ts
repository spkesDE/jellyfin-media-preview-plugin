import { getItemIdFromCard } from '../cards/discovery';
import { ensureMetadataOverlay, hideMetadataOverlay, showMetadataOverlay } from '../cards/lifecycle';
import { getOrCreateCardState } from '../cards/state';
import { config } from '../config';
import { getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import { metadataOverlayCache } from '../core/storage';
import type { JellyfinItem } from '../types/jellyfin';
import type { MetadataOverlayInfo } from '../types/preview';

function formatRuntime(runtimeTicks: number | null | undefined): string | null {
  const totalMinutes = Math.round((Number(runtimeTicks) || 0) / 600000000);
  if (!totalMinutes) {
    return null;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function formatCommunityRating(rating: number | null | undefined): string | null {
  if (!Number.isFinite(Number(rating))) {
    return null;
  }

  return `${Number(rating).toFixed(1)}★`;
}

export function getMetadataOverlayInfo(itemId: string | null | undefined): Promise<MetadataOverlayInfo | null> {
  if (!itemId) {
    return Promise.resolve(null);
  }

  if (metadataOverlayCache.has(itemId)) {
    return metadataOverlayCache.get(itemId)!;
  }

  const apiClient = getGlobalApiClient();
  const userId = getCurrentUserId(apiClient);
  if (!apiClient || !userId) {
    return Promise.resolve(null);
  }

  const request = requestJson<JellyfinItem>(`Users/${encodeURIComponent(userId)}/Items/${encodeURIComponent(itemId)}`, {
    Fields: 'ProductionYear,RunTimeTicks,OfficialRating,CommunityRating'
  }).then((item) => {
    if (!item?.Id) {
      return null;
    }

    return {
      itemId: item.Id,
      title: item.Name || null,
      year: Number.isFinite(Number(item.ProductionYear)) ? Number(item.ProductionYear) : null,
      runtimeTicks: Number.isFinite(Number(item.RunTimeTicks)) ? Number(item.RunTimeTicks) : null,
      officialRating: item.OfficialRating || null,
      communityRating: Number.isFinite(Number(item.CommunityRating)) ? Number(item.CommunityRating) : null
    };
  }).catch((error) => {
    metadataOverlayCache.delete(itemId);
    debugLog('Failed to load metadata overlay info.', itemId, error);
    return null;
  });

  metadataOverlayCache.set(itemId, request);
  return request.then((result) => {
    if (!result) {
      metadataOverlayCache.delete(itemId);
    }

    return result;
  });
}

export function renderMetadataOverlay(card: HTMLElement): void {
  const state = getOrCreateCardState(card);
  if (!config.metadataOverlayEnabled || !state.previewActive) {
    hideMetadataOverlay(state);
    return;
  }

  const itemId = getItemIdFromCard(card);
  if (!itemId) {
    hideMetadataOverlay(state);
    return;
  }

  const requestToken = state.latestRequestToken;
  getMetadataOverlayInfo(itemId).then((info) => {
    if (!info || !state.previewActive || requestToken !== state.latestRequestToken) {
      hideMetadataOverlay(state);
      return;
    }

    const title = config.metadataOverlayShowTitle ? info.title : null;
    const metaParts = [
      config.metadataOverlayShowYear && info.year ? String(info.year) : null,
      config.metadataOverlayShowRuntime ? formatRuntime(info.runtimeTicks) : null,
      config.metadataOverlayShowOfficialRating ? info.officialRating : null,
      config.metadataOverlayShowCommunityRating ? formatCommunityRating(info.communityRating) : null
    ].filter(Boolean) as string[];

    if (!title && !metaParts.length) {
      hideMetadataOverlay(state);
      return;
    }

    if (!ensureMetadataOverlay(state)) {
      return;
    }

    showMetadataOverlay(state, title, metaParts.join(' • '));
  }).catch((error) => {
    debugLog('Failed to render metadata overlay.', itemId, error);
  });
}
