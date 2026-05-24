import { buildApiUrl, getAuthHeaders, getGlobalApiClient } from './apiClient';

export function requestJson<T>(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  const apiClient = getGlobalApiClient();
  const url = buildApiUrl(path, query);
  if (!apiClient || !url) {
    return Promise.reject(new Error('ApiClient is not available.'));
  }

  if (typeof apiClient.ajax === 'function') {
    return Promise.resolve(apiClient.ajax({
      type: 'GET',
      url,
      dataType: 'json'
    }) as Promise<T> | T);
  }

  return fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: getAuthHeaders(apiClient)
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
  });
}
