import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/config';
import {
  applyEffectivePreferences,
  clearUserPreferenceState,
  loadUserPreferences,
  persistCurrentAudioPreference,
  rememberUserAudioChange,
  saveUserPreferences,
  toExplicitPreferences,
  type UserPreferencesResponse
} from '../../src/userPreferences/api';
import { ensureUserSettingsMenuEntry, removeUserSettingsEntries } from '../../src/admin/navigation';
import { PLUGIN_ICON } from '../../src/constants';
import type { JellyfinAjaxRequest } from '../../src/types/jellyfin';

const defaults = { trailerAudioEnabled: false, trailerVolumePercent: 35, rememberAudioChanges: true };

function response(overrides: Partial<UserPreferencesResponse> = {}): UserPreferencesResponse {
  return {
    enabled: true,
    preferences: { trailerAudioEnabled: null, trailerVolumePercent: null, rememberAudioChanges: null },
    effective: { ...defaults },
    defaults: { ...defaults },
    ...overrides
  };
}

describe('user audio preferences', () => {
  const originalAudio = config.trailerAudioEnabled;
  const originalVolume = config.trailerVolumePercent;
  const originalEnabled = config.userAudioPreferencesEnabled;
  const originalHoverDelay = config.hoverDelayMs;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearUserPreferenceState();
    removeUserSettingsEntries();
    config.trailerAudioEnabled = originalAudio;
    config.trailerVolumePercent = originalVolume;
    config.userAudioPreferencesEnabled = originalEnabled;
    config.hoverDelayMs = originalHoverDelay;
    config.userPreviewEnabled = true;
    config.userPreviewSource = 'inherit';
    delete window.ApiClient;
    window.localStorage.clear();
  });

  function installApiClient(answer: UserPreferencesResponse = response()) {
    const ajax = vi.fn<(request: JellyfinAjaxRequest) => Promise<UserPreferencesResponse>>(() =>
      Promise.resolve(answer)
    );
    window.ApiClient = {
      getCurrentUserId: () => 'user-1',
      getUrl: (path: string) => `http://jellyfin.test/${path}`,
      ajax
    };
    return ajax;
  }

  it('remembers audio explicitly: untouched fields keep their stored value', () => {
    const current = response({
      preferences: { trailerAudioEnabled: false, trailerVolumePercent: null, rememberAudioChanges: null },
      effective: { trailerAudioEnabled: false, trailerVolumePercent: 35, rememberAudioChanges: true }
    });
    const values = { trailerAudioEnabled: false, trailerVolumePercent: 35, rememberAudioChanges: true };

    const untouchedPreview = { previewEnabled: null, previewSource: null, hoverDelayMs: null };
    expect(toExplicitPreferences(current, values)).toEqual({
      ...untouchedPreview,
      trailerAudioEnabled: false,
      trailerVolumePercent: null,
      rememberAudioChanges: null
    });
    expect(toExplicitPreferences(current, { ...values, trailerAudioEnabled: true })).toEqual({
      ...untouchedPreview,
      trailerAudioEnabled: true,
      trailerVolumePercent: null,
      rememberAudioChanges: null
    });
    expect(toExplicitPreferences(current, { ...values, trailerVolumePercent: 140 })).toEqual({
      ...untouchedPreview,
      trailerAudioEnabled: false,
      trailerVolumePercent: 100,
      rememberAudioChanges: null
    });
    expect(toExplicitPreferences(current, { ...values, rememberAudioChanges: false })).toEqual({
      ...untouchedPreview,
      trailerAudioEnabled: false,
      trailerVolumePercent: null,
      rememberAudioChanges: false
    });
  });

  it('stores preview choices only when they differ from what is in effect', () => {
    const current = response({
      preferences: { trailerAudioEnabled: null, trailerVolumePercent: null, rememberAudioChanges: null },
      effective: {
        trailerAudioEnabled: false,
        trailerVolumePercent: 35,
        rememberAudioChanges: true,
        previewEnabled: true,
        previewSource: 'inherit',
        hoverDelayMs: 300
      }
    });
    const values = {
      trailerAudioEnabled: false,
      trailerVolumePercent: 35,
      rememberAudioChanges: true,
      previewEnabled: false,
      previewSource: 'prefer-trailer',
      hoverDelayMs: 9000
    };

    expect(toExplicitPreferences(current, values)).toMatchObject({
      previewEnabled: false,
      previewSource: 'prefer-trailer',
      hoverDelayMs: 5000
    });
    expect(
      toExplicitPreferences(current, { ...values, previewEnabled: true, previewSource: 'inherit', hoverDelayMs: 300 })
    ).toMatchObject({ previewEnabled: null, previewSource: null, hoverDelayMs: null });
  });

  it('applies the preview choices to the runtime config', () => {
    applyEffectivePreferences(
      response({
        effective: {
          trailerAudioEnabled: false,
          trailerVolumePercent: 35,
          rememberAudioChanges: true,
          previewEnabled: false,
          previewSource: 'trickplay',
          hoverDelayMs: 900
        }
      })
    );

    expect(config.userPreviewEnabled).toBe(false);
    expect(config.userPreviewSource).toBe('trickplay');
    expect(config.hoverDelayMs).toBe(900);
  });

  it('applies the effective preferences to the runtime config', () => {
    applyEffectivePreferences(
      response({ effective: { trailerAudioEnabled: true, trailerVolumePercent: 70, rememberAudioChanges: true } })
    );

    expect(config.trailerAudioEnabled).toBe(true);
    expect(config.trailerVolumePercent).toBe(70);
  });

  it('keeps changes for this page only when automatic saving is off', () => {
    const ajax = installApiClient();
    config.userAudioPreferencesEnabled = true;
    applyEffectivePreferences(response({ effective: { ...defaults, rememberAudioChanges: false } }));

    config.trailerAudioEnabled = true;
    persistCurrentAudioPreference();
    vi.runAllTimers();
    expect(ajax).not.toHaveBeenCalled();

    // A reload applies the saved values again.
    applyEffectivePreferences(response({ effective: { ...defaults, rememberAudioChanges: false } }));
    expect(config.trailerAudioEnabled).toBe(false);
  });

  it('saves volume changes made in the expanded player', () => {
    const ajax = installApiClient();
    config.userAudioPreferencesEnabled = true;
    applyEffectivePreferences(response());

    rememberUserAudioChange(false, 55);
    vi.runAllTimers();

    expect(config.trailerAudioEnabled).toBe(true);
    expect(config.trailerVolumePercent).toBe(55);
    expect(JSON.parse(ajax.mock.calls[0][0].data ?? '{}')).toEqual({
      trailerAudioEnabled: true,
      trailerVolumePercent: 55
    });
  });

  it('sends quick mute and volume changes as one request to the audio endpoint', () => {
    const ajax = installApiClient();
    config.userAudioPreferencesEnabled = true;
    applyEffectivePreferences(response());

    config.trailerAudioEnabled = true;
    persistCurrentAudioPreference();
    config.trailerVolumePercent = 60;
    persistCurrentAudioPreference();
    vi.advanceTimersByTime(299);
    expect(ajax).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(ajax).toHaveBeenCalledTimes(1);
    const request = ajax.mock.calls[0][0];
    expect(request.type).toBe('PUT');
    expect(request.url).toContain('media-preview/preferences/trailer-audio');
    expect(JSON.parse(request.data ?? '{}')).toEqual({ trailerAudioEnabled: true, trailerVolumePercent: 60 });
  });

  it('drops a waiting mute change when the dialog is saved', async () => {
    const ajax = installApiClient();
    config.userAudioPreferencesEnabled = true;
    applyEffectivePreferences(response());

    persistCurrentAudioPreference();
    await saveUserPreferences({ trailerAudioEnabled: false, trailerVolumePercent: null });
    vi.runAllTimers();

    expect(ajax).toHaveBeenCalledTimes(1);
    expect(ajax.mock.calls[0][0].url).not.toContain('trailer-audio');
  });

  it('keeps the volume only in this browser when saving is turned off', () => {
    const ajax = installApiClient();
    applyEffectivePreferences(response({ enabled: false }));

    config.trailerVolumePercent = 80;
    persistCurrentAudioPreference();
    vi.runAllTimers();
    expect(ajax).not.toHaveBeenCalled();

    config.trailerVolumePercent = 35;
    applyEffectivePreferences(response({ enabled: false }));
    expect(config.trailerVolumePercent).toBe(80);
    expect(config.trailerAudioEnabled).toBe(false);
  });

  it('shares one request between concurrent loads and reuses the answer', async () => {
    const ajax = installApiClient();

    const [first, second] = await Promise.all([loadUserPreferences(), loadUserPreferences()]);
    await loadUserPreferences();

    expect(first).toBe(second);
    expect(ajax).toHaveBeenCalledTimes(1);
  });

  it('adds a Media Preview entry with the plugin icon to the user menu', () => {
    config.userAudioPreferencesEnabled = true;
    document.body.innerHTML = `
      <ul role="menu">
        <a href="#/mypreferencesmenu" class="MuiMenuItem-root">
          <div class="MuiListItemIcon-root"><span class="material-icons">settings</span></div>
          <div class="MuiListItemText-root"><span class="MuiListItemText-primary">Settings</span></div>
        </a>
      </ul>`;

    ensureUserSettingsMenuEntry();
    ensureUserSettingsMenuEntry();

    const entries = document.querySelectorAll('[data-media-preview-user-settings-link="true"]');
    expect(entries).toHaveLength(1);
    expect(entries[0].querySelector('.MuiListItemText-primary')?.textContent).toBe('Media Preview');
    expect(entries[0].querySelector('.MuiListItemIcon-root')?.textContent).toBe(PLUGIN_ICON);

    config.userAudioPreferencesEnabled = false;
    ensureUserSettingsMenuEntry();
    expect(document.querySelectorAll('[data-media-preview-user-settings-link="true"]')).toHaveLength(0);
  });
});
