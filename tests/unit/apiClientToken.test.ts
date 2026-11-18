import { afterEach, describe, expect, it } from 'vitest';
import { buildApiUrl } from '../../src/core/apiClient';
import { requestJson } from '../../src/core/request';

describe('access token placement', () => {
  afterEach(() => {
    delete window.ApiClient;
  });

  function installApiClient(onAjax?: (url: string) => void) {
    window.ApiClient = {
      _serverInfo: { Id: 'server-a', UserId: 'user-a' },
      getCurrentUserId: () => 'user-a',
      accessToken: () => 'secret-token',
      getUrl(path, query) {
        const url = new URL(`https://jellyfin.example/${path}`);
        url.searchParams.set('api_key', 'secret-token');
        Object.entries(query || {}).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
        return url.toString();
      },
      ajax: async (request: { url: string }) => {
        onAjax?.(request.url);
        return {};
      }
    };
  }

  it('keeps the token on media URLs the browser loads itself', () => {
    installApiClient();
    const url = new URL(buildApiUrl('Videos/a/stream.mp4', { Static: true }) || '');
    expect(url.searchParams.get('ApiKey')).toBe('secret-token');
    expect(url.searchParams.has('api_key')).toBe(false);
  });

  it('leaves every token form out of header-authenticated JSON requests', async () => {
    let requestedUrl = '';
    installApiClient((url) => {
      requestedUrl = url;
    });

    await requestJson('Users/user-a/Items/a');

    const url = new URL(requestedUrl);
    expect(url.searchParams.has('ApiKey')).toBe(false);
    expect(url.searchParams.has('api_key')).toBe(false);
    expect(url.searchParams.has('X-Emby-Token')).toBe(false);
  });
});
