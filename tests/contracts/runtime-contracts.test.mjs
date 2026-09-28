import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('keyboard and focus previews initialize without hover hardware', async () => {
  const [main, delegatedEvents] = await Promise.all([read('src/main.ts'), read('src/interaction/delegatedEvents.ts')]);

  assert.doesNotMatch(main, /matchMedia[\s\S]*Skipping media preview/);
  assert.match(delegatedEvents, /addEventListener\('focusin'/);
  assert.match(delegatedEvents, /handleKeyboardPreviewKey/);
});

test('preview caches are scoped to the active server and user', async () => {
  const [apiClient, storage, trailer] = await Promise.all([
    read('src/core/apiClient.ts'),
    read('src/core/storage.ts'),
    read('src/preview/trailer.ts')
  ]);

  assert.match(apiClient, /serverIdentity[\s\S]*userId/);
  assert.match(storage, /activePreviewCacheContext[\s\S]*clearPreviewCacheEntries/);
  assert.match(trailer, /getScopedPreviewCacheKey\(contextKey, itemId\)/);
});

test('trailer cleanup is independent from static frame restoration', async () => {
  const lifecycle = await read('src/cards/lifecycle.ts');

  assert.match(
    lifecycle,
    /config\.restoreOnLeave \|\| activePreviewSource === PREVIEW_SOURCE_TRAILER \|\| state\.trailerMedia/
  );
  assert.match(lifecycle, /clearTrailerMedia\(state\)/);
});

test('preferred sources use configurable ordered fallback chains', async () => {
  const [source, directPlay, renderer] = await Promise.all([
    read('src/preview/source.ts'),
    read('src/preview/directPlay.ts'),
    read('src/preview/renderTrailer.ts')
  ]);

  assert.match(source, /PREVIEW_SOURCE_PREFER_TRAILER[\s\S]*config\.preferTrailerFallbacks/);
  assert.match(source, /PREVIEW_SOURCE_PREFER_DIRECT_PLAY[\s\S]*config\.preferDirectPlayFallbacks/);
  assert.match(source, /fallbacks\.filter\(\(entry\) => entry\.enabled\)/);
  assert.match(directPlay, /provider: 'direct-play'/);
  assert.match(renderer, /markVideoTrailerUnavailable/);
  assert.match(renderer, /markDirectPlayUnavailable/);
  assert.match(renderer, /mediaElement\.playbackRate = playbackRate/);
  assert.match(renderer, /previewDurationSeconds/);
  assert.match(directPlay, /!config\.directPlayPreviewEnabled/);
  assert.match(directPlay, /directPlayTranscodeFallbackEnabled/);
});

test('prefer-trickplay reads its configured fallback chain', async () => {
  const source = await read('src/preview/source.ts');

  assert.match(source, /PREVIEW_SOURCE_PREFER_TRICKPLAY[\s\S]*config\.preferTrickplayFallbacks/);
});

test('Direct Play is selectable at every preview rule level', async () => {
  const [constants, source, settings, backend] = await Promise.all([
    read('src/constants.ts'),
    read('src/preview/source.ts'),
    read('src/config/tabs/GeneralTab.vue'),
    read('Jellyfin.Plugin.MediaPreview/Configuration/PluginConfigurationNormalizer.cs')
  ]);

  assert.match(constants, /VALID_PREVIEW_SOURCES[\s\S]*PREVIEW_SOURCE_DIRECT_PLAY/);
  assert.match(source, /source === PREVIEW_SOURCE_DIRECT_PLAY[\s\S]*getDirectPlayPreview/);
  assert.match(settings, /value: 'direct-play', label: 'Only Direct Play'/);
  assert.match(settings, /value: 'prefer-direct-play', label: 'Prefer Direct Play'/);
  assert.match(settings, /ConfigHelpTooltip|help-text/);
  assert.match(backend, /ValidContentTypePreviewSources[\s\S]*"direct-play"/);
});

test('advanced source chains expose local and remote trailers separately', async () => {
  const [advanced, source, trailer] = await Promise.all([
    read('src/config/tabs/AdvancedTab.vue'),
    read('src/preview/source.ts'),
    read('src/preview/trailer.ts')
  ]);

  assert.match(advanced, /primary="local-trailer"/);
  assert.match(advanced, /Preferred Source Chains/);
  assert.match(source, /'local-trailer'[\s\S]*getTrailerPreview\(itemId, 'local'\)/);
  assert.match(source, /'remote-trailer'[\s\S]*getTrailerPreview\(itemId, 'remote'\)/);
  assert.match(trailer, /source === 'local'[\s\S]*source === 'remote'/);
});

test('backend and frontend defaults remain aligned', async () => {
  const [backend, runtimeDefaults, settingsDefaults] = await Promise.all([
    read('Jellyfin.Plugin.MediaPreview/Configuration/PluginConfiguration.cs'),
    read('src/config.ts'),
    read('src/config/libs/defaults.ts')
  ]);

  assert.match(backend, /PreviewSource[^=]*= "trickplay"/);
  assert.match(backend, /HoverMode[^=]*= "scrub"/);
  assert.match(backend, /YouTubeCropStrength[^=]*= "medium"/);
  assert.match(backend, /DirectPlayStartPercent[^=]*= 20/);
  assert.match(backend, /DirectPlayPreviewEnabled[^=]*= true/);
  assert.match(backend, /DirectPlayPlaybackRate[^=]*= 1\.5/);
  assert.match(backend, /DirectPlayTranscodeFallbackEnabled[^=]*= true/);
  assert.match(runtimeDefaults, /previewSource: PREVIEW_SOURCE_TRICKPLAY/);
  assert.match(runtimeDefaults, /hoverMode: 'scrub'/);
  assert.match(runtimeDefaults, /youTubeCropStrength: 'medium'/);
  assert.match(runtimeDefaults, /directPlayStartPercent: 20/);
  assert.match(runtimeDefaults, /directPlayPreviewEnabled: true/);
  assert.match(runtimeDefaults, /directPlayPlaybackRate: 1\.5/);
  assert.match(runtimeDefaults, /directPlayTranscodeFallbackEnabled: true/);
  assert.match(settingsDefaults, /PreviewSource: 'trickplay'/);
  assert.match(settingsDefaults, /HoverMode: 'scrub'/);
  assert.match(settingsDefaults, /YouTubeCropStrength: 'medium'/);
  assert.match(settingsDefaults, /DirectPlayStartPercent: 20/);
  assert.match(settingsDefaults, /DirectPlayPreviewEnabled: true/);
  assert.match(settingsDefaults, /DirectPlayPlaybackRate: 1\.5/);
  assert.match(settingsDefaults, /DirectPlayTranscodeFallbackEnabled: true/);
});
