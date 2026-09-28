import { afterEach, describe, expect, it } from 'vitest';
import { getTrailerInfo } from '../../src/preview/trailer';

describe('trailer metadata cache', () => {
  afterEach(() => {
    delete window.ApiClient;
  });

  it('does not repeat a recent negative trailer lookup for the same item', async () => {
    let requestCount = 0;
    window.ApiClient = {
      _serverInfo: { Id: 'server-a', UserId: 'user-a' },
      getCurrentUserId: () => 'user-a',
      getUrl(path, query) {
        const url = new URL(`https://jellyfin.example/${path}`);
        Object.entries(query || {}).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
        return url.toString();
      },
      ajax: async () => {
        requestCount += 1;
        return {
          Id: 'movie-a',
          Type: 'Movie',
          LocalTrailerCount: 0,
          RemoteTrailers: []
        };
      }
    };

    await expect(getTrailerInfo('movie-a')).resolves.toBeNull();
    await expect(getTrailerInfo('movie-a')).resolves.toBeNull();

    expect(requestCount).toBe(1);
  });
});
