import { buildApiUrl } from '../core/apiClient';
import { tilePreloadCache } from '../core/storage';
import type { TrickplayPreview } from '../types/preview';

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
