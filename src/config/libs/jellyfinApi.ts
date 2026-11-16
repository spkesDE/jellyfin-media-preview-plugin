import { getCurrentUserId, getGlobalApiClient } from '../../core/apiClient';
import type { JellyfinItem } from '../../types/jellyfin';
import type { ConfigLibrary, ConfigUser } from './types';

export function requestJson(path: string): Promise<unknown> {
  const apiClient = getGlobalApiClient();
  if (!apiClient) {
    return Promise.resolve(null);
  }

  const url = apiClient.getUrl?.(path) ?? path;
  if (!url) {
    return Promise.resolve(null);
  }

  if (apiClient.ajax) {
    return Promise.resolve(apiClient.ajax({ type: 'GET', url, dataType: 'json' }));
  }

  return fetch(url, { credentials: 'same-origin' }).then((response) => (response.ok ? response.json() : null));
}

export function normalizeItems(payload: unknown): JellyfinItem[] {
  if (payload && typeof payload === 'object' && Array.isArray((payload as { Items?: unknown[] }).Items)) {
    return (payload as { Items: JellyfinItem[] }).Items;
  }

  return Array.isArray(payload) ? (payload as JellyfinItem[]) : [];
}

export async function loadLibraries(): Promise<ConfigLibrary[]> {
  const userId = getCurrentUserId(getGlobalApiClient());
  if (!userId) {
    return [];
  }

  try {
    const payload = await requestJson(`Users/${encodeURIComponent(userId)}/Views`);
    return normalizeItems(payload)
      .filter((item): item is JellyfinItem & { Id: string; Name: string } => !!item.Id && !!item.Name)
      .map((item) => ({ Id: item.Id, Name: item.Name, CollectionType: item.CollectionType }));
  } catch {
    return [];
  }
}

export async function loadUsers(): Promise<ConfigUser[]> {
  const payload = await requestJson('Users');
  const users = Array.isArray(payload) ? (payload as Array<Record<string, unknown>>) : [];
  return users
    .filter((user) => typeof user.Id === 'string' && typeof user.Name === 'string')
    .map((user) => ({
      Id: user.Id as string,
      Name: user.Name as string,
      IsAdministrator: (user.Policy as { IsAdministrator?: unknown } | undefined)?.IsAdministrator === true
    }))
    .sort((left, right) => left.Name.localeCompare(right.Name));
}
