import type { MetadataOverlayInfo, TrailerInfo, TrickplayInfo } from '../types/preview';

const ITEM_CACHE_LIMIT = 500;
const TILE_PRELOAD_CACHE_LIMIT = 1500;

class BoundedMap<Key, Value> extends Map<Key, Value> {
  constructor(private readonly limit: number) {
    super();
  }

  override set(key: Key, value: Value): this {
    if (this.has(key)) {
      this.delete(key);
    }

    while (this.size >= this.limit) {
      const oldestKey = this.keys().next().value as Key | undefined;
      if (oldestKey === undefined) {
        break;
      }
      this.delete(oldestKey);
    }

    return super.set(key, value);
  }
}

class BoundedSet<Value> extends Set<Value> {
  constructor(private readonly limit: number) {
    super();
  }

  override add(value: Value): this {
    if (this.has(value)) {
      this.delete(value);
    }

    while (this.size >= this.limit) {
      const oldestValue = this.values().next().value as Value | undefined;
      if (oldestValue === undefined) {
        break;
      }
      this.delete(oldestValue);
    }

    return super.add(value);
  }
}

export const itemInfoCache = new BoundedMap<string, Promise<TrickplayInfo | null>>(ITEM_CACHE_LIMIT);
export const trailerInfoCache = new BoundedMap<string, Promise<TrailerInfo | null>>(ITEM_CACHE_LIMIT);
export const metadataOverlayCache = new BoundedMap<string, Promise<MetadataOverlayInfo | null>>(ITEM_CACHE_LIMIT);
export const libraryIdCache = new BoundedMap<string, Promise<string | null>>(ITEM_CACHE_LIMIT);
export const tilePreloadCache = new BoundedSet<string>(TILE_PRELOAD_CACHE_LIMIT);
export const missingTrickplayCache = new BoundedMap<string, number>(ITEM_CACHE_LIMIT);

export function clearPreviewCaches(): void {
  itemInfoCache.clear();
  trailerInfoCache.clear();
  metadataOverlayCache.clear();
  libraryIdCache.clear();
  tilePreloadCache.clear();
  missingTrickplayCache.clear();
}
