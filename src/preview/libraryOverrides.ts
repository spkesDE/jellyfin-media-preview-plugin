import { config, normalizeLibraryPreviewSourceOverrides } from '../config';
import { debugLog } from '../core/logger';
import { requestJson } from '../core/request';
import type { LibraryPreviewSourceOverride } from '../types/config';

interface LibraryOverridesResponse {
  overrides?: LibraryPreviewSourceOverride[] | null;
}

let loaded = false;
let pendingLoad: Promise<void> | null = null;

/**
 * Loads the library source overrides once a user is signed in. The anonymous client script
 * only says whether overrides exist, so library ids are not visible on the login page.
 * A failed request (for example before sign-in) is retried on the next preview.
 */
export function ensureLibraryPreviewSourceOverrides(): Promise<void> {
  if (loaded || !config.hasLibraryPreviewSourceOverrides || config.libraryPreviewSourceOverrides.length) {
    return Promise.resolve();
  }

  if (!pendingLoad) {
    pendingLoad = requestJson<LibraryOverridesResponse>('media-preview/config/library-overrides')
      .then((response) => {
        config.libraryPreviewSourceOverrides = normalizeLibraryPreviewSourceOverrides(
          Array.isArray(response?.overrides) ? response.overrides : []
        );
        loaded = true;
      })
      .catch((error: unknown) => {
        debugLog('Could not load library preview source overrides.', error);
      })
      .finally(() => {
        pendingLoad = null;
      });
  }

  return pendingLoad;
}

export function clearLibraryPreviewSourceOverrideState(): void {
  loaded = false;
  pendingLoad = null;
}
