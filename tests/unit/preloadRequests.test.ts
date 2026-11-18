import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/config';
import { libraryIdCache } from '../../src/core/storage';
import { ITEM_BATCH_FIELDS, ITEM_BATCH_SIZE, loadItemsBatched } from '../../src/preview/itemBatch';
import { getLibraryIdForItem, getRouteLibraryId, getShareableAncestors } from '../../src/preview/library';
import {
  TRICKPLAY_PRELOAD_ROOT_MARGIN,
  TRICKPLAY_PRELOAD_SCROLL_IDLE_MS,
  cancelTrickplayPreloads,
  clearTrickplayPreloads,
  observeTrickplayPreload
} from '../../src/preview/preload';
import { getPlaybackProgressForItem } from '../../src/preview/progress';
import { getTrickplayInfo } from '../../src/preview/trickplay';
import type { JellyfinItem } from '../../src/types/jellyfin';

const trickplay = {
  '320': {
    'source-a': { Width: 320, Height: 180, TileWidth: 10, TileHeight: 10, ThumbnailCount: 100, Interval: 10_000 }
  }
};

function movie(id: string, extra: Partial<JellyfinItem> = {}): JellyfinItem {
  return {
    Id: id,
    Type: 'Movie',
    RunTimeTicks: 10_000,
    UserData: { PlaybackPositionTicks: 0, Played: false },
    MediaSources: [{ Id: 'source-a' }],
    Trickplay: trickplay,
    ...extra
  };
}

interface RecordedRequest {
  path: string;
  query: URLSearchParams;
}

let requests: RecordedRequest[] = [];
let items: Record<string, JellyfinItem> = {};
let ancestors: Record<string, JellyfinItem[]> = {};
let loadedImages: string[] = [];

function installApiClient(): void {
  window.ApiClient = {
    _serverInfo: { Id: 'server', UserId: 'user' },
    getUrl: (path, query) => {
      const url = new URL(`https://jellyfin.example/${path}`);
      Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
      return url.toString();
    },
    ajax: async (request) => {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\//, '');
      requests.push({ path, query: url.searchParams });

      if (path === 'Users/user/Items') {
        const ids = (url.searchParams.get('Ids') || '').split(',');
        return { Items: ids.map((id) => items[id]).filter(Boolean) };
      }

      const ancestorMatch = /^Items\/([^/]+)\/Ancestors$/.exec(path);
      if (ancestorMatch) {
        return ancestors[ancestorMatch[1]] || [];
      }

      const itemMatch = /^Users\/user\/Items\/([^/]+)$/.exec(path);
      if (itemMatch) {
        return items[itemMatch[1]] || null;
      }

      return { Items: [] };
    }
  };
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observed = new Set<Element>();

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.add(element);
  }

  unobserve(element: Element): void {
    this.observed.delete(element);
  }

  disconnect(): void {
    this.observed.clear();
  }

  trigger(elements: Element[], isIntersecting: boolean): void {
    this.callback(
      elements.map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver
    );
  }
}

function latestObserver(): FakeIntersectionObserver {
  const observer = FakeIntersectionObserver.instances.at(-1);
  if (!observer) {
    throw new Error('No IntersectionObserver was created.');
  }

  return observer;
}

function createCard(itemId: string): HTMLElement {
  const card = document.createElement('div');
  card.dataset.id = itemId;
  document.body.appendChild(card);
  return card;
}

function apiRequests(): RecordedRequest[] {
  return requests;
}

const originalConfig = {
  trickplayPreloadEnabled: config.trickplayPreloadEnabled,
  trickplayPreloadMaxCards: config.trickplayPreloadMaxCards,
  inProgressPreviewSource: config.inProgressPreviewSource,
  libraryPreviewSourceOverrides: config.libraryPreviewSourceOverrides
};

beforeEach(() => {
  vi.useFakeTimers();
  requests = [];
  items = {};
  ancestors = {};
  loadedImages = [];
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal(
    'Image',
    class {
      set src(value: string) {
        loadedImages.push(value);
      }
    }
  );
  installApiClient();
  config.trickplayPreloadEnabled = true;
  config.trickplayPreloadMaxCards = 24;
});

afterEach(() => {
  clearTrickplayPreloads();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.assign(config, originalConfig);
  delete window.ApiClient;
  window.history.replaceState(null, '', '/');
});

describe('batched item loading', () => {
  it('loads progress, runtime and Trickplay for several cards in one request', async () => {
    items = { a: movie('a'), b: movie('b'), c: movie('c') };

    const loading = loadItemsBatched(['a', 'b', 'c', 'a']);
    await vi.advanceTimersByTimeAsync(200);
    await loading;

    expect(apiRequests()).toHaveLength(1);
    const [request] = apiRequests();
    expect(request.path).toBe('Users/user/Items');
    expect(request.query.get('Ids')).toBe('a,b,c');
    expect(request.query.get('Fields')).toBe(ITEM_BATCH_FIELDS);
    expect(request.query.get('Fields')).toContain('RunTimeTicks');
    expect(request.query.get('EnableUserData')).toBe('true');

    // Hover reads the same data from the shared caches, without a request of its own.
    config.inProgressPreviewSource = 'direct-play';
    await expect(getTrickplayInfo('b')).resolves.toMatchObject({ itemId: 'b', thumbnailCount: 100 });
    await expect(getPlaybackProgressForItem('c')).resolves.toMatchObject({ isInProgress: false });
    expect(apiRequests()).toHaveLength(1);
  });

  it('splits large batches so the query string stays bounded', async () => {
    const ids = Array.from({ length: ITEM_BATCH_SIZE + 10 }, (_, index) => `item-${index}`);
    ids.forEach((id) => {
      items[id] = movie(id);
    });

    const loading = loadItemsBatched(ids);
    await vi.advanceTimersByTimeAsync(200);
    await loading;

    expect(apiRequests().map((request) => request.query.get('Ids')!.split(',').length)).toEqual([ITEM_BATCH_SIZE, 10]);
  });

  it('lets a hover join a batch that is still being collected', async () => {
    items = { a: movie('a') };

    void loadItemsBatched(['a']);
    const hover = getTrickplayInfo('a');
    await vi.advanceTimersByTimeAsync(200);

    await expect(hover).resolves.toMatchObject({ itemId: 'a' });
    expect(apiRequests()).toHaveLength(1);
  });

  it('falls back to a single request when the batch misses an item', async () => {
    items = { a: movie('a') };
    const loading = loadItemsBatched(['a', 'gone']);
    await vi.advanceTimersByTimeAsync(200);
    await loading;
    items.gone = movie('gone');

    await expect(getTrickplayInfo('gone')).resolves.toMatchObject({ itemId: 'gone' });
    expect(apiRequests().map((request) => request.path)).toEqual(['Users/user/Items', 'Users/user/Items/gone']);
  });
});

describe('library lookup without Ancestors', () => {
  const configured = ['lib-movies', 'lib-shows'];

  it('reads the library from topParentId on library pages', async () => {
    window.history.replaceState(null, '', '/web/#/movies?topParentId=LIB-MOVIES&collectionType=movies');

    expect(getRouteLibraryId(configured, 'Movie')).toBe('lib-movies');
    await expect(getLibraryIdForItem('a', configured, 'Movie')).resolves.toBe('lib-movies');
    expect(apiRequests()).toHaveLength(0);
  });

  it('answers "no rule" for a library page without a configured rule, still without a request', async () => {
    window.history.replaceState(null, '', '/web/#/tv?topParentId=lib-other');

    await expect(getLibraryIdForItem('a', configured, 'Series')).resolves.toBeNull();
    expect(apiRequests()).toHaveLength(0);
  });

  it('only trusts parentId when it is a configured library itself', () => {
    window.history.replaceState(null, '', '/web/#/list?parentId=lib-shows');
    expect(getRouteLibraryId(configured, 'Video')).toBe('lib-shows');

    window.history.replaceState(null, '', '/web/#/list?parentId=some-sub-folder');
    expect(getRouteLibraryId(configured, 'Video')).toBeUndefined();
  });

  it('does not query Ancestors when no library rules are configured', async () => {
    await expect(getLibraryIdForItem('a', [], 'Movie')).resolves.toBeNull();
    expect(apiRequests()).toHaveLength(0);
  });

  it('reuses the Ancestors result for sibling items of the same season', async () => {
    window.history.replaceState(null, '', '/web/#/home');
    items = {
      e1: { Id: 'e1', Type: 'Episode', ParentId: 'season-1', SeasonId: 'season-1', SeriesId: 'series-1' },
      e2: { Id: 'e2', Type: 'Episode', ParentId: 'season-1', SeasonId: 'season-1', SeriesId: 'series-1' },
      e3: { Id: 'e3', Type: 'Episode', ParentId: 'season-2', SeasonId: 'season-2', SeriesId: 'series-1' }
    };
    ancestors.e1 = [
      { Id: 'season-1', Type: 'Season' },
      { Id: 'series-1', Type: 'Series' },
      { Id: 'lib-shows', Type: 'CollectionFolder' },
      { Id: 'root', Type: 'UserRootFolder' }
    ];

    const loading = loadItemsBatched(['e1', 'e2', 'e3']);
    await vi.advanceTimersByTimeAsync(200);
    await loading;

    await expect(getLibraryIdForItem('e1', configured, 'Episode')).resolves.toBe('lib-shows');
    await expect(getLibraryIdForItem('e2', configured, 'Episode')).resolves.toBe('lib-shows');
    await expect(getLibraryIdForItem('e3', configured, 'Episode')).resolves.toBe('lib-shows');
    expect(apiRequests().filter((request) => request.path.endsWith('/Ancestors'))).toHaveLength(1);
  });

  it('never shares the user root between libraries', () => {
    const shared = getShareableAncestors(
      [
        { Id: 'folder', Type: 'Folder' },
        { Id: 'lib-movies', Type: 'CollectionFolder' },
        { Id: 'root', Type: 'UserRootFolder' }
      ],
      'lib-movies'
    );

    expect(shared.map((ancestor) => ancestor.Id)).toEqual(['folder', 'lib-movies']);
  });

  it('keeps a "no matching rule" answer instead of asking again', async () => {
    window.history.replaceState(null, '', '/web/#/home');
    ancestors.a = [{ Id: 'lib-other', Type: 'CollectionFolder' }];

    await expect(getLibraryIdForItem('a', configured, 'Movie')).resolves.toBeNull();
    await expect(getLibraryIdForItem('a', configured, 'Movie')).resolves.toBeNull();
    expect(apiRequests()).toHaveLength(1);
    expect(libraryIdCache.size).toBe(1);
  });
});

describe('viewport preload', () => {
  async function showCardsAndRest(cards: HTMLElement[]): Promise<void> {
    latestObserver().trigger(cards, true);
    await vi.advanceTimersByTimeAsync(TRICKPLAY_PRELOAD_SCROLL_IDLE_MS + 100);
  }

  it('uses a small margin and one batched request for all visible cards', async () => {
    items = { a: movie('a'), b: movie('b'), c: movie('c') };
    const cards = ['a', 'b', 'c'].map(createCard);
    cards.forEach((card) => observeTrickplayPreload(card, card.dataset.id, 0.5, 'Movie'));

    expect(latestObserver().options?.rootMargin).toBe(TRICKPLAY_PRELOAD_ROOT_MARGIN);
    await showCardsAndRest(cards);

    expect(apiRequests().map((request) => request.path)).toEqual(['Users/user/Items']);
    expect(apiRequests()[0].query.get('Ids')).toBe('a,b,c');
    // Only the start tile per card; the neighbouring tiles wait for hover intent.
    expect(loadedImages).toHaveLength(3);
  });

  it('does not resolve series in the viewport preload', async () => {
    items = { a: movie('a'), show: { Id: 'show', Type: 'Series' } };
    const movieCard = createCard('a');
    const seriesCard = createCard('show');
    const unknownSeriesCard = createCard('show-unknown');
    items['show-unknown'] = { Id: 'show-unknown', Type: 'Series' };
    observeTrickplayPreload(movieCard, 'a', 0.5, 'Movie');
    observeTrickplayPreload(seriesCard, 'show', 0.5, 'Series');
    observeTrickplayPreload(unknownSeriesCard, 'show-unknown', 0.5, null);

    expect(latestObserver().observed.has(seriesCard)).toBe(false);
    await showCardsAndRest([movieCard, unknownSeriesCard]);

    expect(apiRequests().map((request) => request.path)).toEqual(['Users/user/Items']);
    expect(apiRequests().some((request) => request.path.startsWith('Shows/NextUp'))).toBe(false);
  });

  it('waits until scrolling rests and drops cards that left the viewport meanwhile', async () => {
    items = { a: movie('a'), b: movie('b') };
    const [first, second] = ['a', 'b'].map(createCard);
    observeTrickplayPreload(first, 'a', 0.5, 'Movie');
    observeTrickplayPreload(second, 'b', 0.5, 'Movie');

    latestObserver().trigger([first, second], true);
    await vi.advanceTimersByTimeAsync(TRICKPLAY_PRELOAD_SCROLL_IDLE_MS - 100);
    document.dispatchEvent(new Event('scroll'));
    latestObserver().trigger([first], false);
    await vi.advanceTimersByTimeAsync(TRICKPLAY_PRELOAD_SCROLL_IDLE_MS - 100);
    expect(apiRequests()).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(200);
    expect(apiRequests()).toHaveLength(1);
    expect(apiRequests()[0].query.get('Ids')).toBe('b');
  });

  it('preloads at most the configured number of cards per page', async () => {
    config.trickplayPreloadMaxCards = 2;
    const ids = ['a', 'b', 'c', 'd'];
    ids.forEach((id) => {
      items[id] = movie(id);
    });
    const cards = ids.map(createCard);
    cards.forEach((card) => observeTrickplayPreload(card, card.dataset.id, 0.5, 'Movie'));

    await showCardsAndRest(cards);

    expect(apiRequests()).toHaveLength(1);
    expect(apiRequests()[0].query.get('Ids')).toBe('a,b');
  });
});

describe('preload caches across navigation', () => {
  it('keeps loaded data when preloads are cancelled, so returning to a page sends nothing', async () => {
    items = { a: movie('a'), b: movie('b') };
    const cards = ['a', 'b'].map(createCard);
    cards.forEach((card) => observeTrickplayPreload(card, card.dataset.id, 0.5, 'Movie'));
    latestObserver().trigger(cards, true);
    await vi.advanceTimersByTimeAsync(TRICKPLAY_PRELOAD_SCROLL_IDLE_MS + 100);
    expect(apiRequests()).toHaveLength(1);

    // Navigation away: pending work stops, caches stay.
    cancelTrickplayPreloads();
    window.history.replaceState(null, '', '/web/#/details?id=a');

    // Back on the grid: the same cards are bound again.
    window.history.replaceState(null, '', '/web/#/movies?topParentId=lib');
    cards.forEach((card) => observeTrickplayPreload(card, card.dataset.id, 0.5, 'Movie'));
    latestObserver().trigger(cards, true);
    await vi.advanceTimersByTimeAsync(TRICKPLAY_PRELOAD_SCROLL_IDLE_MS + 100);

    await expect(getTrickplayInfo('a')).resolves.toMatchObject({ itemId: 'a' });
    expect(apiRequests()).toHaveLength(1);
  });

  it('drops queued work that never ran, so it can be preloaded later', async () => {
    items = { a: movie('a') };
    const card = createCard('a');
    observeTrickplayPreload(card, 'a', 0.5, 'Movie');
    latestObserver().trigger([card], true);
    cancelTrickplayPreloads();
    await vi.advanceTimersByTimeAsync(TRICKPLAY_PRELOAD_SCROLL_IDLE_MS + 100);
    expect(apiRequests()).toHaveLength(0);

    observeTrickplayPreload(card, 'a', 0.5, 'Movie');
    latestObserver().trigger([card], true);
    await vi.advanceTimersByTimeAsync(TRICKPLAY_PRELOAD_SCROLL_IDLE_MS + 100);
    expect(apiRequests()).toHaveLength(1);
  });
});
