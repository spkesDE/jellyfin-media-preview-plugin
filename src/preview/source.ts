import { config } from '../config';
import {
  PREVIEW_SOURCE_PREFER_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_TRAILER,
  PREVIEW_SOURCE_TRICKPLAY,
  VALID_PREVIEW_SOURCES
} from '../constants';
import { getTrailerPreview } from './trailer';
import { getTrickplayPreview } from './trickplay';
import type { PreviewResult } from '../types/preview';

export function getEffectivePreviewSource(): string {
  return VALID_PREVIEW_SOURCES.has(config.previewSource)
    ? config.previewSource
    : PREVIEW_SOURCE_TRICKPLAY;
}

export function getPreviewUrl(itemId: string, percent: number): Promise<PreviewResult | null> {
  const effectiveSource = getEffectivePreviewSource();

  if (effectiveSource === PREVIEW_SOURCE_TRICKPLAY) {
    return getTrickplayPreview(itemId, percent);
  }

  if (effectiveSource === PREVIEW_SOURCE_TRAILER) {
    return getTrailerPreview(itemId);
  }

  if (effectiveSource === PREVIEW_SOURCE_PREFER_TRICKPLAY) {
    return getTrickplayPreview(itemId, percent).then<PreviewResult | null>((preview) => {
      if (preview) {
        return preview;
      }

      return getTrailerPreview(itemId);
    });
  }

  if (effectiveSource === PREVIEW_SOURCE_PREFER_TRAILER) {
    return getTrailerPreview(itemId).then<PreviewResult | null>((preview) => {
      if (preview) {
        return preview;
      }

      return getTrickplayPreview(itemId, percent);
    });
  }

  return Promise.resolve(null);
}
