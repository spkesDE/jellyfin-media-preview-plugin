import type { MetadataOverlayInfo, TrailerInfo, TrickplayInfo } from '../types/preview';

export const itemInfoCache = new Map<string, Promise<TrickplayInfo | null>>();
export const trailerInfoCache = new Map<string, Promise<TrailerInfo | null>>();
export const metadataOverlayCache = new Map<string, Promise<MetadataOverlayInfo | null>>();
export const libraryIdCache = new Map<string, Promise<string | null>>();
export const tilePreloadCache = new Set<string>();
export const missingTrickplayCache = new Map<string, number>();
