import { config } from '../config';
import {
  PREVIEW_SOURCE_INHERIT,
  PREVIEW_SOURCE_PREFER_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_SMART,
  PREVIEW_SOURCE_TRAILER,
  PREVIEW_SOURCE_TRICKPLAY,
  VALID_CONTENT_TYPE_PREVIEW_SOURCES,
  VALID_PREVIEW_SOURCES
} from '../constants';
import { getTrailerPreview } from './trailer';
import { getTrickplayPreview } from './trickplay';
import type { SmartPrimarySource } from '../types/config';
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

export function getSmartPrimarySource(itemType?: string | null): SmartPrimarySource {
  if (itemType === 'Movie') {
    return config.smartMoviePrimarySource;
  }

  if (itemType === 'Series') {
    return config.smartSeriesPrimarySource;
  }

  if (itemType === 'Episode') {
    return config.smartEpisodePrimarySource;
  }

  if (itemType === 'Video') {
    return config.smartVideoPrimarySource;
  }

  return config.smartVideoPrimarySource;
}

function getSmartTrailerPreview(itemId: string): Promise<PreviewResult | null> {
  return getTrailerPreview(itemId, {
    remoteScope: config.smartTrailerScope
  });
}

function getSmartPreviewUrl(itemId: string, percent: number, itemType?: string | null): Promise<PreviewResult | null> {
  const primarySource = getSmartPrimarySource(itemType);

  if (primarySource === PREVIEW_SOURCE_TRAILER) {
    return getSmartTrailerPreview(itemId).then<PreviewResult | null>((preview) => {
      if (preview) {
        return preview;
      }

      return getTrickplayPreview(itemId, percent);
    });
  }

  return getTrickplayPreview(itemId, percent).then<PreviewResult | null>((preview) => {
    if (preview) {
      return preview;
    }

    return getSmartTrailerPreview(itemId);
  });
}

export function getPreviewUrl(itemId: string, percent: number, itemType?: string | null): Promise<PreviewResult | null> {
  const effectiveSource = getContentTypePreviewSource(itemType);

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

  if (effectiveSource === PREVIEW_SOURCE_SMART) {
    return getSmartPreviewUrl(itemId, percent, itemType);
  }

  return Promise.resolve(null);
}
