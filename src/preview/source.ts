import { config } from '../config';
import {
  PREVIEW_SOURCE_INHERIT,
  PREVIEW_SOURCE_DIRECT_PLAY,
  PREVIEW_SOURCE_PREFER_DIRECT_PLAY,
  PREVIEW_SOURCE_PREFER_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_TRAILER,
  PREVIEW_SOURCE_TRICKPLAY,
  VALID_CONTENT_TYPE_PREVIEW_SOURCES,
  VALID_PREVIEW_SOURCES
} from '../constants';
import { getTrailerPreview } from './trailer';
import { getTrickplayPreview } from './trickplay';
import { getDirectPlayPreview } from './directPlay';
import { getLibraryIdForItem } from './library';
import type { PreviewResult } from '../types/preview';
import type { PreviewChainSource, PreviewFallbackSource } from '../types/config';

type ResolvedPreviewSource = PreviewChainSource | 'trailer';

export function getEffectivePreviewSource(): string {
  return VALID_PREVIEW_SOURCES.has(config.previewSource) ? config.previewSource : PREVIEW_SOURCE_TRICKPLAY;
}

export function getContentTypePreviewSource(itemType?: string | null): string {
  const typeOverride =
    itemType === 'Movie'
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
  if (
    !override ||
    !VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(override.previewSource) ||
    override.previewSource === PREVIEW_SOURCE_INHERIT
  ) {
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

function getPreviewForSingleSource(
  itemId: string,
  percent: number,
  source: ResolvedPreviewSource
): Promise<PreviewResult | null> {
  if (source === PREVIEW_SOURCE_TRICKPLAY) {
    return getTrickplayPreview(itemId, percent);
  }

  if (source === PREVIEW_SOURCE_TRAILER) {
    return getTrailerPreview(itemId);
  }

  if (source === 'local-trailer') {
    return getTrailerPreview(itemId, 'local');
  }

  if (source === 'remote-trailer') {
    return getTrailerPreview(itemId, 'remote');
  }

  if (source === PREVIEW_SOURCE_DIRECT_PLAY) {
    return getDirectPlayPreview(itemId);
  }

  return Promise.resolve(null);
}

export function getPreviewSourceChain(effectiveSource: string): ResolvedPreviewSource[] {
  const preferredSources: Record<string, { primary: PreviewChainSource; fallbacks: PreviewFallbackSource[] }> = {
    [PREVIEW_SOURCE_PREFER_TRICKPLAY]: {
      primary: PREVIEW_SOURCE_TRICKPLAY,
      fallbacks: config.preferTrickplayFallbacks
    },
    [PREVIEW_SOURCE_PREFER_TRAILER]: {
      primary: 'local-trailer',
      fallbacks: config.preferTrailerFallbacks
    },
    [PREVIEW_SOURCE_PREFER_DIRECT_PLAY]: {
      primary: PREVIEW_SOURCE_DIRECT_PLAY,
      fallbacks: config.preferDirectPlayFallbacks
    }
  };
  const preferred = preferredSources[effectiveSource];
  if (preferred) {
    return [preferred.primary, ...preferred.fallbacks.filter((entry) => entry.enabled).map((entry) => entry.source)];
  }

  if (
    effectiveSource === PREVIEW_SOURCE_TRICKPLAY ||
    effectiveSource === PREVIEW_SOURCE_TRAILER ||
    effectiveSource === PREVIEW_SOURCE_DIRECT_PLAY
  ) {
    return [effectiveSource];
  }

  return [];
}

export function previewSourceUsesTrickplay(effectiveSource: string): boolean {
  return getPreviewSourceChain(effectiveSource).includes(PREVIEW_SOURCE_TRICKPLAY);
}

function getPreviewForSource(itemId: string, percent: number, effectiveSource: string): Promise<PreviewResult | null> {
  const chain = getPreviewSourceChain(effectiveSource);

  return chain.reduce<Promise<PreviewResult | null>>(
    (previewPromise, source) =>
      previewPromise.then((preview) => preview || getPreviewForSingleSource(itemId, percent, source)),
    Promise.resolve(null)
  );
}

export function getPreviewUrl(
  itemId: string,
  percent: number,
  itemType?: string | null
): Promise<PreviewResult | null> {
  return getPreviewSourceForItem(itemId, itemType).then((effectiveSource) =>
    getPreviewForSource(itemId, percent, effectiveSource)
  );
}
