import type { JellyfinApiClient, JellyfinCurrentUser } from '../types/jellyfin';

export function getGlobalApiClient(): JellyfinApiClient | null {
  return window.ApiClient || window.apiClient || null;
}

export function getCurrentUserId(apiClient: JellyfinApiClient | null): string | null {
  if (!apiClient) {
    return null;
  }

  if (typeof apiClient.getCurrentUserId === 'function') {
    return apiClient.getCurrentUserId() || null;
  }

  if (typeof apiClient.getCurrentUser === 'function') {
    const currentUser = apiClient.getCurrentUser() as JellyfinCurrentUser | null | undefined;
    if (currentUser?.Id) {
      return currentUser.Id;
    }
  }

  if (apiClient._serverInfo?.UserId) {
    return apiClient._serverInfo.UserId;
  }

  return null;
}

export function buildApiUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string | null {
  const apiClient = getGlobalApiClient();
  if (!apiClient) {
    return null;
  }

  const accessToken = apiClient && (
    typeof apiClient.accessToken === 'function'
      ? apiClient.accessToken()
      : apiClient._serverInfo?.AccessToken
  );

  if (typeof apiClient.getUrl === 'function') {
    const builtUrl = apiClient.getUrl(path, query);
    if (!builtUrl) {
      return builtUrl;
    }

    const finalUrl = new URL(builtUrl, window.location.origin);
    if (accessToken && !finalUrl.searchParams.has('api_key') && !finalUrl.searchParams.has('X-Emby-Token')) {
      finalUrl.searchParams.set('api_key', accessToken);
    }

    return finalUrl.toString();
  }

  const serverAddress = typeof apiClient.serverAddress === 'function'
    ? apiClient.serverAddress()
    : (apiClient._serverAddress || apiClient._serverInfo?.ManualAddress || '');

  if (!serverAddress) {
    return null;
  }

  const normalized = serverAddress.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
  const url = new URL(normalized, window.location.origin);
  if (query) {
    Object.keys(query).forEach((key) => {
      const value = query[key];
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  if (accessToken && !url.searchParams.has('api_key') && !url.searchParams.has('X-Emby-Token')) {
    url.searchParams.set('api_key', accessToken);
  }

  return url.toString();
}

export function getAuthHeaders(apiClient: JellyfinApiClient | null): Record<string, string> {
  const headers: Record<string, string> = {};
  const accessToken = apiClient?._serverInfo?.AccessToken;
  if (accessToken) {
    headers['X-Emby-Token'] = accessToken;
  }

  return headers;
}
