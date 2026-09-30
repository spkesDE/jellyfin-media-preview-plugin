import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearPreviewCaches } from '../../src/core/storage';
import { getTrickplayInfo, getTrickplayPreview } from '../../src/preview/trickplay';
import type { JellyfinItem } from '../../src/types/jellyfin';

function makeTrickplay(width: number, mediaSourceId: string) {
  return {
    [String(width)]: {
      [mediaSourceId]: {
        Width: width,
        Height: Math.round((width * 9) / 16),
        TileWidth: 10,
        TileHeight: 10,
        ThumbnailCount: 86,
        Interval: 10000
      }
    }
  };
}

function makeEpisode(id: string, withTrickplay = true): JellyfinItem {
  return {
    Id: id,
    Name: id,
    Type: 'Episode',
    MediaSources: [{ Id: id }],
    Trickplay: withTrickplay ? makeTrickplay(320, id) : undefined
  };
}

let requestPaths: string[] = [];
let itemResult: JellyfinItem | null = null;
let nextUpResult: { Items?: JellyfinItem[] } = {};
let itemsResult: { Items?: JellyfinItem[] } = {};

describe('Trickplay resolution for container items', () => {
  beforeEach(() => {
    clearPreviewCaches();
    requestPaths = [];
    itemResult = null;
    nextUpResult = {};
    itemsResult = {};
    window.ApiClient = {
      getCurrentUserId: () => 'user-1',
      getUrl(path, query) {
        const url = new URL(`https://jellyfin.example/${path}`);
        Object.entries(query || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
          }
        });
        return url.toString();
      },
      ajax(request) {
        const url = new URL(request.url);
        requestPaths.push(url.pathname);
        if (url.pathname.endsWith('/Shows/NextUp')) {
          return nextUpResult;
        }
        if (url.pathname.endsWith('/Items')) {
          return itemsResult;
        }
        if (url.pathname.includes('/Users/')) {
          return itemResult;
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      }
    };
  });

  afterEach(() => {
    clearPreviewCaches();
    delete window.ApiClient;
  });

  it('resolves a Series to its Next Up episode', async () => {
    itemResult = { Id: 'series-1', Name: 'Show', Type: 'Series' };
    nextUpResult = { Items: [makeEpisode('ep-next')] };
    itemsResult = { Items: [makeEpisode('ep-first')] };

    const info = await getTrickplayInfo('series-1');

    expect(info?.itemId).toBe('ep-next');
    expect(info?.type).toBe('Episode');
    expect(requestPaths.some((path) => path.endsWith('/Shows/NextUp'))).toBe(true);
    expect(requestPaths.some((path) => path.endsWith('/Items'))).toBe(false);
  });

  it('falls back to the first episode when Next Up has no trickplay', async () => {
    itemResult = { Id: 'series-2', Name: 'Show', Type: 'Series' };
    nextUpResult = { Items: [makeEpisode('ep-next', false)] };
    itemsResult = { Items: [makeEpisode('ep-first')] };

    const info = await getTrickplayInfo('series-2');

    expect(info?.itemId).toBe('ep-first');
    expect(requestPaths.some((path) => path.endsWith('/Items'))).toBe(true);
  });

  it('falls back to the first episode when Next Up is empty', async () => {
    itemResult = { Id: 'series-3', Name: 'Show', Type: 'Series' };
    nextUpResult = { Items: [] };
    itemsResult = { Items: [makeEpisode('ep-first')] };

    const info = await getTrickplayInfo('series-3');

    expect(info?.itemId).toBe('ep-first');
  });

  it('uses the first episode for a Season and skips Next Up', async () => {
    itemResult = { Id: 'season-1', Name: 'Season 1', Type: 'Season' };
    itemsResult = { Items: [makeEpisode('ep-season-first')] };

    const info = await getTrickplayInfo('season-1');

    expect(info?.itemId).toBe('ep-season-first');
    expect(requestPaths.some((path) => path.endsWith('/Shows/NextUp'))).toBe(false);
  });

  it('builds the tile URL from the resolved episode', async () => {
    itemResult = { Id: 'series-4', Name: 'Show', Type: 'Series' };
    nextUpResult = { Items: [makeEpisode('ep-next')] };

    const preview = await getTrickplayPreview('series-4', 0.5);

    expect(preview?.tileUrl).toContain('/Videos/ep-next/Trickplay/320/');
  });

  it('leaves non-container items untouched', async () => {
    itemResult = {
      Id: 'movie-1',
      Name: 'Movie',
      Type: 'Movie',
      MediaSources: [{ Id: 'movie-1' }],
      Trickplay: makeTrickplay(320, 'movie-1')
    };

    const info = await getTrickplayInfo('movie-1');

    expect(info?.itemId).toBe('movie-1');
    expect(requestPaths.some((path) => path.endsWith('/Shows/NextUp') || path.endsWith('/Items'))).toBe(false);
  });
});
