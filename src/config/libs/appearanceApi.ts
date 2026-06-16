import { getCurrentUserId, getGlobalApiClient } from '../../core/apiClient';
import type { JellyfinItem } from '../../types/jellyfin';
import type { AppearancePreview } from './types';
import { normalizeItems, requestJson } from './jellyfinApi';

function formatRuntime(runtimeTicks?: number): string {
  const totalMinutes = Math.round((Number(runtimeTicks) || 0) / 600000000);
  if (!totalMinutes) {
    return '';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${minutes ? ` ${minutes}m` : ''}` : `${minutes}m`;
}

function getImageUrl(item: JellyfinItem, imageType: 'Primary' | 'Backdrop', maxWidth: number): string {
  const apiClient = getGlobalApiClient();
  if (!apiClient || !item.Id) {
    return '';
  }

  const isBackdrop = imageType === 'Backdrop';
  const tag = isBackdrop ? item.BackdropImageTags?.[0] : item.ImageTags?.Primary;
  if (!tag) {
    return '';
  }

  if (apiClient.getImageUrl) {
    return apiClient.getImageUrl(item.Id, {
      type: imageType,
      tag,
      maxWidth,
      quality: 90,
      ...(isBackdrop ? { index: 0 } : {})
    }) ?? '';
  }

  return apiClient.getUrl?.(
    `Items/${encodeURIComponent(item.Id)}/Images/${imageType}${isBackdrop ? '/0' : ''}`
      + `?tag=${encodeURIComponent(tag)}&maxWidth=${maxWidth}&quality=90`
  ) ?? '';
}

function preloadImage(url: string): Promise<string> {
  if (!url) {
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(''), 5000);
    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(url);
    };
    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve('');
    };
    image.src = url;
  });
}

export async function loadAppearancePreview(): Promise<AppearancePreview | null> {
  const userId = getCurrentUserId(getGlobalApiClient());
  if (!userId) {
    return null;
  }

  const query = [
    'IncludeItemTypes=Movie',
    'Recursive=true',
    'Fields=ProductionYear,RunTimeTicks,OfficialRating,CommunityRating',
    'EnableImages=true',
    'EnableImageTypes=Primary,Backdrop',
    'ImageTypeLimit=1',
    'Limit=100'
  ].join('&');

  try {
    const payload = await requestJson(`Users/${encodeURIComponent(userId)}/Items?${query}`);
    const movies = normalizeItems(payload).filter((item) =>
      !!item.Id && (!!item.ImageTags?.Primary || !!item.BackdropImageTags?.length)
    );
    if (!movies.length) {
      return null;
    }

    const movie = movies[Math.floor(Math.random() * movies.length)];
    const [primaryUrl, backdropUrl] = await Promise.all([
      preloadImage(getImageUrl(movie, 'Primary', 600)),
      preloadImage(getImageUrl(movie, 'Backdrop', 800))
    ]);
    const posterUrl = primaryUrl || backdropUrl;
    const previewUrl = backdropUrl || primaryUrl;
    if (!posterUrl || !previewUrl) {
      return null;
    }

    return {
      title: movie.Name || 'Example Movie',
      year: movie.ProductionYear ? String(movie.ProductionYear) : '',
      runtime: formatRuntime(movie.RunTimeTicks),
      officialRating: movie.OfficialRating || '',
      communityRating: Number.isFinite(Number(movie.CommunityRating))
        ? `${Number(movie.CommunityRating).toFixed(1)}\u2605`
        : '',
      posterUrl,
      previewUrl
    };
  } catch {
    return null;
  }
}
