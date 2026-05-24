import type { TrailerInfo, TrickplayInfo } from '../types/preview';

export const itemInfoCache = new Map<string, Promise<TrickplayInfo | null>>();
export const trailerInfoCache = new Map<string, Promise<TrailerInfo | null>>();
export const tilePreloadCache = new Set<string>();
