import { config } from '../config';
import { getCurrentUserId, getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { putJson, requestJson } from '../core/request';

export const USER_PREFERENCES_PATH = 'media-preview/preferences';
const TRAILER_AUDIO_PATH = `${USER_PREFERENCES_PATH}/trailer-audio`;
const PERSIST_DEBOUNCE_MS = 300;
const RESPONSE_CACHE_MS = 5 * 60 * 1000;
const LOCAL_VOLUME_KEY_PREFIX = 'jellyfin-media-preview:volume:';

export interface UserAudioPreferences {
  trailerAudioEnabled: boolean | null;
  trailerVolumePercent: number | null;
  rememberAudioChanges: boolean | null;
  previewEnabled?: boolean | null;
  previewSource?: string | null;
  hoverDelayMs?: number | null;
}

export interface EffectiveAudioPreferences {
  trailerAudioEnabled: boolean;
  trailerVolumePercent: number;
  /** Save mute and volume changes made on a preview automatically. */
  rememberAudioChanges: boolean;
  /** False when the user turned previews off. */
  previewEnabled?: boolean;
  /** `inherit` follows the administrator's source rules. */
  previewSource?: string;
  hoverDelayMs?: number;
}

export interface UserPreferencesResponse {
  enabled: boolean;
  preferences: UserAudioPreferences;
  effective: EffectiveAudioPreferences;
  defaults: EffectiveAudioPreferences;
}

const preferenceState = {
  userId: null as string | null,
  response: null as UserPreferencesResponse | null,
  responseAt: 0,
  inFlight: null as Promise<UserPreferencesResponse> | null,
  persistTimer: null as number | null,
  persistInFlight: null as Promise<void> | null
};

function currentUserId(): string | null {
  return getCurrentUserId(getGlobalApiClient());
}

function clampVolume(value: unknown): number {
  return Math.round(Math.max(0, Math.min(100, Number(value) || 0)));
}

/** True when no user is given or the given user is the one signed in on this page. */
export function isCurrentUser(userId?: string | null): boolean {
  return !userId || userId === currentUserId();
}

function userQuery(userId?: string): Record<string, string> | undefined {
  return isCurrentUser(userId) ? undefined : { userId: userId! };
}

function cacheResponse(userId: string | null, response: UserPreferencesResponse): void {
  preferenceState.userId = userId;
  preferenceState.response = response;
  preferenceState.responseAt = Date.now();
}

/**
 * Loads a user's settings. The signed-in user's answer is kept for five minutes and
 * concurrent calls share one request; another user's settings (admin view) are always
 * loaded fresh.
 */
export function loadUserPreferences(targetUserId?: string): Promise<UserPreferencesResponse> {
  if (!isCurrentUser(targetUserId)) {
    return requestJson<UserPreferencesResponse>(USER_PREFERENCES_PATH, userQuery(targetUserId));
  }

  const userId = currentUserId();
  const cached = preferenceState.response;
  if (cached && userId === preferenceState.userId && Date.now() - preferenceState.responseAt < RESPONSE_CACHE_MS) {
    return Promise.resolve(cached);
  }

  if (preferenceState.inFlight && userId === preferenceState.userId) {
    return preferenceState.inFlight;
  }

  if (userId !== preferenceState.userId) {
    preferenceState.response = null;
    preferenceState.responseAt = 0;
  }
  preferenceState.userId = userId;
  const request = requestJson<UserPreferencesResponse>(USER_PREFERENCES_PATH)
    .then((response) => {
      if (preferenceState.userId === userId) {
        cacheResponse(userId, response);
      }
      return response;
    })
    .finally(() => {
      if (preferenceState.inFlight === request) {
        preferenceState.inFlight = null;
      }
    });
  preferenceState.inFlight = request;
  return request;
}

/** Starts loading the dialog data early, e.g. when the pointer reaches the menu entry. */
export function preloadUserPreferences(): void {
  loadUserPreferences().catch(() => undefined);
}

export function saveUserPreferences(
  preferences: UserAudioPreferences,
  targetUserId?: string
): Promise<UserPreferencesResponse> {
  if (isCurrentUser(targetUserId)) cancelPendingAudioSave();
  return putJson<UserPreferencesResponse>(USER_PREFERENCES_PATH, { preferences }, userQuery(targetUserId));
}

export function resetUserPreferences(targetUserId?: string): Promise<UserPreferencesResponse> {
  if (isCurrentUser(targetUserId)) cancelPendingAudioSave();
  return putJson<UserPreferencesResponse>(USER_PREFERENCES_PATH, { reset: true }, userQuery(targetUserId));
}

/**
 * Builds what the dialog saves. Audio values are remembered explicitly: a field the user
 * did not touch keeps its stored value, a changed field stores the new value.
 */
export function toExplicitPreferences(
  response: UserPreferencesResponse,
  values: EffectiveAudioPreferences
): UserAudioPreferences {
  const volume = clampVolume(values.trailerVolumePercent);
  return {
    trailerAudioEnabled:
      values.trailerAudioEnabled === response.effective.trailerAudioEnabled
        ? response.preferences.trailerAudioEnabled
        : values.trailerAudioEnabled,
    trailerVolumePercent:
      volume === response.effective.trailerVolumePercent ? response.preferences.trailerVolumePercent : volume,
    rememberAudioChanges:
      values.rememberAudioChanges === response.effective.rememberAudioChanges
        ? (response.preferences.rememberAudioChanges ?? null)
        : values.rememberAudioChanges,
    previewEnabled:
      values.previewEnabled === undefined || values.previewEnabled === (response.effective.previewEnabled ?? true)
        ? (response.preferences.previewEnabled ?? null)
        : values.previewEnabled,
    previewSource:
      values.previewSource === undefined || values.previewSource === (response.effective.previewSource ?? 'inherit')
        ? (response.preferences.previewSource ?? null)
        : values.previewSource === 'inherit'
          ? null
          : values.previewSource,
    hoverDelayMs:
      values.hoverDelayMs === undefined || values.hoverDelayMs === response.effective.hoverDelayMs
        ? (response.preferences.hoverDelayMs ?? null)
        : Math.round(Math.max(0, Math.min(5000, Number(values.hoverDelayMs) || 0)))
  };
}

function localVolumeKey(): string | null {
  const userId = currentUserId();
  return userId ? LOCAL_VOLUME_KEY_PREFIX + userId : null;
}

function readLocalVolume(): number | null {
  const key = localVolumeKey();
  if (!key) return null;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? null : clampVolume(stored);
  } catch {
    return null;
  }
}

function writeLocalVolume(volume: number): void {
  const key = localVolumeKey();
  if (!key) return;
  try {
    window.localStorage.setItem(key, String(clampVolume(volume)));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the value then lasts for this page only.
  }
}

/**
 * Applies a server answer to the running previews. When saving is turned off, mute follows the
 * server default and the volume falls back to the value kept in this browser.
 */
export function applyEffectivePreferences(response: UserPreferencesResponse): void {
  cacheResponse(currentUserId(), response);
  config.trailerAudioEnabled = response.effective.trailerAudioEnabled;
  config.trailerVolumePercent = response.effective.trailerVolumePercent;
  config.userPreviewEnabled = response.effective.previewEnabled !== false;
  config.userPreviewSource = response.effective.previewSource || 'inherit';
  if (Number.isFinite(response.effective.hoverDelayMs)) {
    config.hoverDelayMs = Math.max(0, Number(response.effective.hoverDelayMs));
  }
  if (!response.enabled) {
    const localVolume = readLocalVolume();
    if (localVolume !== null) {
      config.trailerVolumePercent = localVolume;
    }
  }
}

/** Loads the settings once per signed-in user and applies them to the runtime config. */
export function syncCurrentUserPreferences(): Promise<void> {
  const userId = currentUserId();
  if (!userId || (userId === preferenceState.userId && (preferenceState.response || preferenceState.inFlight))) {
    return Promise.resolve();
  }

  return loadUserPreferences()
    .then((response) => {
      if (currentUserId() === userId) {
        applyEffectivePreferences(response);
      }
    })
    .catch((error: unknown) => {
      debugLog('Could not load Media Preview user preferences.', error);
    });
}

function sendPendingAudio(): Promise<void> {
  preferenceState.persistTimer = null;
  const userId = currentUserId();
  const request = putJson<UserPreferencesResponse>(TRAILER_AUDIO_PATH, {
    trailerAudioEnabled: config.trailerAudioEnabled,
    trailerVolumePercent: clampVolume(config.trailerVolumePercent)
  })
    .then((response) => {
      // Keep the cached answer in step so the dialog shows the new value; the running
      // previews already use it, so the config is left alone.
      if (currentUserId() === userId) {
        cacheResponse(userId, response);
      }
    })
    .catch((error: unknown) => {
      debugLog('Could not save Media Preview trailer audio.', error);
    })
    .finally(() => {
      if (preferenceState.persistInFlight === request) {
        preferenceState.persistInFlight = null;
      }
    });
  preferenceState.persistInFlight = request;
  return request;
}

/**
 * Saves the current mute/volume from a preview's controls. Changes within 300 ms are sent
 * as one request. When saving is turned off, only the volume is kept, in this browser.
 */
export function persistCurrentAudioPreference(): void {
  const response = preferenceState.response;
  if (!config.userAudioPreferencesEnabled || response?.enabled !== true) {
    writeLocalVolume(config.trailerVolumePercent);
    return;
  }

  // With automatic saving off, the change lasts for this page only; a reload returns to
  // the values saved in the dialog.
  if (response.effective.rememberAudioChanges === false) {
    return;
  }

  if (preferenceState.persistTimer !== null) {
    window.clearTimeout(preferenceState.persistTimer);
  }
  preferenceState.persistTimer = window.setTimeout(() => void sendPendingAudio(), PERSIST_DEBOUNCE_MS);
}

/**
 * Records a mute or volume change made in a player's own controls (e.g. the expanded
 * trailer) and saves it like a change on the preview's buttons.
 */
export function rememberUserAudioChange(muted: boolean, volumePercent: number): void {
  const volume = clampVolume(volumePercent);
  const audioEnabled = !muted && volume > 0;
  if (audioEnabled === config.trailerAudioEnabled && volume === clampVolume(config.trailerVolumePercent)) {
    return;
  }

  config.trailerAudioEnabled = audioEnabled;
  config.trailerVolumePercent = volume;
  persistCurrentAudioPreference();
}

/** Sends a waiting mute/volume change now, so the dialog opens with the latest value. */
export function flushPendingAudioSave(): Promise<void> {
  if (preferenceState.persistTimer !== null) {
    window.clearTimeout(preferenceState.persistTimer);
    return sendPendingAudio();
  }
  return preferenceState.persistInFlight ?? Promise.resolve();
}

/** A saved dialog wins over a mute/volume change that has not been sent yet. */
function cancelPendingAudioSave(): void {
  if (preferenceState.persistTimer !== null) {
    window.clearTimeout(preferenceState.persistTimer);
    preferenceState.persistTimer = null;
  }
}

export function clearUserPreferenceState(): void {
  cancelPendingAudioSave();
  preferenceState.userId = null;
  preferenceState.response = null;
  preferenceState.responseAt = 0;
  preferenceState.inFlight = null;
  preferenceState.persistInFlight = null;
}
