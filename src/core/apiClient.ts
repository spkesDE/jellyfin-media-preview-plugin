import type {
  JellyfinApiClient,
  JellyfinCurrentUser
} from '../types/jellyfin';

export function getGlobalApiClient(): JellyfinApiClient | null {
  return window.ApiClient || window.apiClient || null;
}

export function getCurrentUserId(
  apiClient: JellyfinApiClient | null
): string | null {
  if (!apiClient) {
    return null;
  }

  if (typeof apiClient.getCurrentUserId === 'function') {
    return apiClient.getCurrentUserId() || null;
  }

  if (typeof apiClient.getCurrentUser === 'function') {
    const currentUser = apiClient.getCurrentUser() as
      | JellyfinCurrentUser
      | null
      | undefined;

    if (currentUser?.Id) {
      return currentUser.Id;
    }
  }

  return apiClient._serverInfo?.UserId || null;
}

export function getAccessToken(
  apiClient: JellyfinApiClient | null
): string | null {
  if (!apiClient) {
    return null;
  }

  const tokenFromMethod =
    typeof apiClient.accessToken === 'function'
      ? apiClient.accessToken()
      : null;

  return tokenFromMethod || apiClient._serverInfo?.AccessToken || null;
}

function normalizeApiKey(
  url: URL,
  fallbackToken: string | null
): void {
  const token =
    url.searchParams.get('ApiKey') ||
    url.searchParams.get('api_key') ||
    url.searchParams.get('X-Emby-Token') ||
    fallbackToken;

  // Jellyfin 12 disables these legacy forms by default.
  url.searchParams.delete('api_key');
  url.searchParams.delete('X-Emby-Token');

  if (token) {
    url.searchParams.set('ApiKey', token);
  }
}

export function buildApiUrl(
  path: string,
  query?: Record<
    string,
    string | number | boolean | null | undefined
  >
): string | null {
  const apiClient = getGlobalApiClient();
  if (!apiClient) {
    return null;
  }

  const accessToken = getAccessToken(apiClient);

  if (typeof apiClient.getUrl === 'function') {
    const builtUrl = apiClient.getUrl(path, query);

    if (!builtUrl) {
      return null;
    }

    const finalUrl = new URL(builtUrl, window.location.origin);
    normalizeApiKey(finalUrl, accessToken);

    return finalUrl.toString();
  }

  const serverAddress =
    typeof apiClient.serverAddress === 'function'
      ? apiClient.serverAddress()
      : (
          apiClient._serverAddress ||
          apiClient._serverInfo?.ManualAddress ||
          ''
        );

  if (!serverAddress) {
    return null;
  }

  const normalized =
    `${serverAddress.replace(/\/+$/, '')}/` +
    path.replace(/^\/+/, '');

  const url = new URL(normalized, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  normalizeApiKey(url, accessToken);

  return url.toString();
}

export function getAuthHeaders(
  apiClient: JellyfinApiClient | null
): Record<string, string> {
  const accessToken = getAccessToken(apiClient);

  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `MediaBrowser Token="${accessToken}"`
  };
}