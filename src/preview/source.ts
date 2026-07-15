import { config } from '../config';
import {
  PREVIEW_SOURCE_INHERIT,
  PREVIEW_SOURCE_PREFER_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_TRAILER,
  PREVIEW_SOURCE_TRICKPLAY,
  VALID_CONTENT_TYPE_PREVIEW_SOURCES,
  VALID_PREVIEW_SOURCES
} from '../constants';
import { getTrailerPreview } from './trailer';
import { getTrickplayPreview } from './trickplay';
import { getLibraryIdForItem } from './library';
import type { PreviewResult } from '../types/preview';

export function getEffectivePreviewSource(): string {
  return VALID_PREVIEW_SOURCES.has(config.previewSource)
    ? config.previewSource
    : PREVIEW_SOURCE_TRICKPLAY;
}

export function getContentTypePreviewSource(itemType?: string | null): string {
  const typeOverride = itemType === 'Movie'
    ? config.moviePreviewSource
    : itemType === 'Series'
      ? config.seriesPreviewSource
      : itemType === 'Episode'
        ? config.episodePreviewSource
        : itemType === 'Video'
          ? config.videoPreviewSource
          : PREVIEW_SOURCE_INHERIT;

  if (!VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(typeOverride) || typeOverride === PREVIEW_SOURCE_INHERIT) {
    return getEffectivePreviewSource();
  }

  return typeOverride;
}

export function getLibraryPreviewSource(libraryId?: string | null): string {
  const override = config.libraryPreviewSourceOverrides.find((entry) => entry.libraryId === libraryId);
  if (!override || !VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(override.previewSource) || override.previewSource === PREVIEW_SOURCE_INHERIT) {
    return PREVIEW_SOURCE_INHERIT;
  }

  return override.previewSource;
}

export function getResolvedPreviewSource(itemType?: string | null, libraryId?: string | null): string {
  const libraryOverride = getLibraryPreviewSource(libraryId);
  if (libraryOverride !== PREVIEW_SOURCE_INHERIT) {
    return libraryOverride;
  }

  return getContentTypePreviewSource(itemType);
}

export function getPreviewSourceForItem(itemId: string, itemType?: string | null): Promise<string> {
  if (!config.libraryPreviewSourceOverrides.length) {
    return Promise.resolve(getContentTypePreviewSource(itemType));
  }

  return getLibraryIdForItem(itemId).then((libraryId) => getResolvedPreviewSource(itemType, libraryId));
}

function getPreviewForSource(itemId: string, percent: number, effectiveSource: string): Promise<PreviewResult | null> {
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

export function getPreviewUrl(itemId: string, percent: number, itemType?: string | null): Promise<PreviewResult | null> {
  return getPreviewSourceForItem(itemId, itemType)
    .then((effectiveSource) => getPreviewForSource(itemId, percent, effectiveSource));
}
