import { describe, expect, it } from 'vitest';
import { getApiContextKey } from '../../src/core/apiClient';
import { getScopedPreviewCacheKey, itemInfoCache, missingTrailerCache, trailerInfoCache } from '../../src/core/storage';
import type { JellyfinApiClient } from '../../src/types/jellyfin';

describe('preview cache scope', () => {
  it('contains server and user identity without the access token', () => {
    const client: JellyfinApiClient = {
      _serverInfo: {
        Id: 'server-a',
        UserId: 'user-a',
        AccessToken: 'secret-token'
      }
    };

    const key = getApiContextKey(client);
    expect(key).toContain('server-a');
    expect(key).toContain('user-a');
    expect(key).not.toContain('secret-token');
  });

  it('invalidates cached promises when the server or user changes', () => {
    const firstKey = getScopedPreviewCacheKey('server-a\u001fuser-a', 'item-a');
    itemInfoCache.set(firstKey, Promise.resolve(null));
    trailerInfoCache.set(firstKey, Promise.resolve(null));
    missingTrailerCache.set(firstKey, Date.now());

    const secondKey = getScopedPreviewCacheKey('server-a\u001fuser-b', 'item-a');

    expect(secondKey).not.toBe(firstKey);
    expect(itemInfoCache.size).toBe(0);
    expect(trailerInfoCache.size).toBe(0);
    expect(missingTrailerCache.size).toBe(0);
  });
});
