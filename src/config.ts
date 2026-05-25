import {
  AUTO_SCRUB_MODE_PING_PONG,
  AUTO_SCRUB_MODE_STEP,
  AUTO_SCRUB_MODE_SWEEP,
  AUTO_SCRUB_PRESET_BALANCED,
  HOVER_MODE_SCRUB,
  PREVIEW_SOURCE_INHERIT,
  PREVIEW_SOURCE_SMART,
  PREVIEW_BACKDROP_DIM_BLUR,
  PREVIEW_MODE_CONTAIN,
  PREVIEW_MODE_COVER,
  SMART_TRAILER_SCOPE_LOCAL_AND_REMOTE,
  PREVIEW_SOURCE_TRICKPLAY,
  TRAILER_EXPAND_BUTTON_TOP_RIGHT,
  VALID_CONTENT_TYPE_PREVIEW_SOURCES,
  VALID_AUTO_SCRUB_MODES,
  VALID_AUTO_SCRUB_PRESETS,
  VALID_HOVER_MODES,
  VALID_PREVIEW_BACKDROP_MODES,
  VALID_PREVIEW_MODES,
  VALID_PREVIEW_SOURCES,
  VALID_SMART_PRIMARY_SOURCES,
  VALID_SMART_TRAILER_SCOPES,
  VALID_TRAILER_EXPAND_BUTTON_POSITIONS,
  VALID_YOUTUBE_CROP_STRENGTHS,
  YOUTUBE_CROP_MEDIUM
} from './constants';
import { clamp } from './core/dom';
import type { PluginConfig, RuntimePluginConfig } from './types/config';

// Runtime in Jellyfin always prepends `window.JellyfinMediaPreviewPluginConfig`
// from the server-side plugin configuration. These values are only a fallback
// for standalone development or unexpected non-plugin loading.
const standaloneFallbackConfig: PluginConfig = {
  enabled: true,
  previewSource: PREVIEW_SOURCE_TRICKPLAY,
  moviePreviewSource: PREVIEW_SOURCE_INHERIT,
  seriesPreviewSource: PREVIEW_SOURCE_INHERIT,
  episodePreviewSource: PREVIEW_SOURCE_INHERIT,
  videoPreviewSource: PREVIEW_SOURCE_INHERIT,
  showNoPreviewMessage: false,
  trailerAudioEnabled: false,
  trailerVolumePercent: 35,
  hoverDelayMs: 300,
  hoverIntentEnabled: false,
  hoverIntentThresholdPx: 18,
  hoverCooldownMs: 0,
  hoverCountdownEnabled: false,
  hoverCountdownPosition: 'top-right',
  trickplayWidth: 320,
  restoreOnLeave: true,
  showProgressIndicator: true,
  debug: false,
  hoverMode: 'scrub',
  autoScrubMode: 'step',
  autoScrubPreset: 'balanced',
  autoScrubStartPercent: 0,
  autoScrubIntervalMs: 220,
  autoScrubDurationMs: 4000,
  autoScrubMinDelayMs: 40,
  autoScrubMaxDelayMs: 1000,
  portraitCardPreviewMode: 'contain',
  backdropCardPreviewMode: 'cover',
  previewBackdropMode: 'dim-blur',
  previewBackdropIntensityPercent: 35,
  youTubeCropStrength: 'medium',
  trailerExpandButtonEnabled: true,
  trailerExpandButtonPosition: 'top-right',
  smartMoviePrimarySource: PREVIEW_SOURCE_TRAILER,
  smartSeriesPrimarySource: PREVIEW_SOURCE_TRICKPLAY,
  smartEpisodePrimarySource: PREVIEW_SOURCE_TRICKPLAY,
  smartVideoPrimarySource: PREVIEW_SOURCE_TRICKPLAY,
  smartTrailerScope: SMART_TRAILER_SCOPE_LOCAL_AND_REMOTE,
  metadataOverlayEnabled: false,
  metadataOverlayPosition: 'bottom-left',
  metadataOverlayShowTitle: true,
  metadataOverlayShowYear: true,
  metadataOverlayShowRuntime: true,
  metadataOverlayShowOfficialRating: true,
  metadataOverlayShowCommunityRating: true
};

const runtimeConfig: RuntimePluginConfig | undefined = window.JellyfinMediaPreviewPluginConfig;

export const config: PluginConfig = {
  enabled: runtimeConfig?.enabled ?? standaloneFallbackConfig.enabled,
  previewSource: runtimeConfig?.previewSource ?? standaloneFallbackConfig.previewSource,
  moviePreviewSource: runtimeConfig?.moviePreviewSource ?? standaloneFallbackConfig.moviePreviewSource,
  seriesPreviewSource: runtimeConfig?.seriesPreviewSource ?? standaloneFallbackConfig.seriesPreviewSource,
  episodePreviewSource: runtimeConfig?.episodePreviewSource ?? standaloneFallbackConfig.episodePreviewSource,
  videoPreviewSource: runtimeConfig?.videoPreviewSource ?? standaloneFallbackConfig.videoPreviewSource,
  showNoPreviewMessage: runtimeConfig?.showNoPreviewMessage ?? standaloneFallbackConfig.showNoPreviewMessage,
  trailerAudioEnabled: runtimeConfig?.trailerAudioEnabled ?? standaloneFallbackConfig.trailerAudioEnabled,
  trailerVolumePercent: runtimeConfig?.trailerVolumePercent ?? standaloneFallbackConfig.trailerVolumePercent,
  hoverDelayMs: runtimeConfig?.hoverDelayMs ?? standaloneFallbackConfig.hoverDelayMs,
  hoverIntentEnabled: runtimeConfig?.hoverIntentEnabled ?? standaloneFallbackConfig.hoverIntentEnabled,
  hoverIntentThresholdPx: runtimeConfig?.hoverIntentThresholdPx ?? standaloneFallbackConfig.hoverIntentThresholdPx,
  hoverCooldownMs: runtimeConfig?.hoverCooldownMs ?? standaloneFallbackConfig.hoverCooldownMs,
  hoverCountdownEnabled: runtimeConfig?.hoverCountdownEnabled ?? standaloneFallbackConfig.hoverCountdownEnabled,
  hoverCountdownPosition: runtimeConfig?.hoverCountdownPosition ?? standaloneFallbackConfig.hoverCountdownPosition,
  trickplayWidth: runtimeConfig?.trickplayWidth ?? standaloneFallbackConfig.trickplayWidth,
  restoreOnLeave: runtimeConfig?.restoreOnLeave ?? standaloneFallbackConfig.restoreOnLeave,
  showProgressIndicator: runtimeConfig?.showProgressIndicator ?? standaloneFallbackConfig.showProgressIndicator,
  debug: runtimeConfig?.debug ?? standaloneFallbackConfig.debug,
  hoverMode: runtimeConfig?.hoverMode ?? standaloneFallbackConfig.hoverMode,
  autoScrubMode: runtimeConfig?.autoScrubMode ?? standaloneFallbackConfig.autoScrubMode,
  autoScrubPreset: runtimeConfig?.autoScrubPreset ?? standaloneFallbackConfig.autoScrubPreset,
  autoScrubStartPercent: runtimeConfig?.autoScrubStartPercent ?? standaloneFallbackConfig.autoScrubStartPercent,
  autoScrubIntervalMs: runtimeConfig?.autoScrubIntervalMs ?? standaloneFallbackConfig.autoScrubIntervalMs,
  autoScrubDurationMs: runtimeConfig?.autoScrubDurationMs ?? standaloneFallbackConfig.autoScrubDurationMs,
  autoScrubMinDelayMs: runtimeConfig?.autoScrubMinDelayMs ?? standaloneFallbackConfig.autoScrubMinDelayMs,
  autoScrubMaxDelayMs: runtimeConfig?.autoScrubMaxDelayMs ?? standaloneFallbackConfig.autoScrubMaxDelayMs,
  portraitCardPreviewMode: runtimeConfig?.portraitCardPreviewMode ?? standaloneFallbackConfig.portraitCardPreviewMode,
  backdropCardPreviewMode: runtimeConfig?.backdropCardPreviewMode ?? standaloneFallbackConfig.backdropCardPreviewMode,
  previewBackdropMode: runtimeConfig?.previewBackdropMode ?? standaloneFallbackConfig.previewBackdropMode,
  previewBackdropIntensityPercent: runtimeConfig?.previewBackdropIntensityPercent ?? standaloneFallbackConfig.previewBackdropIntensityPercent,
  youTubeCropStrength: runtimeConfig?.youTubeCropStrength ?? standaloneFallbackConfig.youTubeCropStrength,
  trailerExpandButtonEnabled: runtimeConfig?.trailerExpandButtonEnabled ?? standaloneFallbackConfig.trailerExpandButtonEnabled,
  trailerExpandButtonPosition: runtimeConfig?.trailerExpandButtonPosition ?? standaloneFallbackConfig.trailerExpandButtonPosition,
  smartMoviePrimarySource: runtimeConfig?.smartMoviePrimarySource ?? standaloneFallbackConfig.smartMoviePrimarySource,
  smartSeriesPrimarySource: runtimeConfig?.smartSeriesPrimarySource ?? standaloneFallbackConfig.smartSeriesPrimarySource,
  smartEpisodePrimarySource: runtimeConfig?.smartEpisodePrimarySource ?? standaloneFallbackConfig.smartEpisodePrimarySource,
  smartVideoPrimarySource: runtimeConfig?.smartVideoPrimarySource ?? standaloneFallbackConfig.smartVideoPrimarySource,
  smartTrailerScope: runtimeConfig?.smartTrailerScope ?? standaloneFallbackConfig.smartTrailerScope,
  metadataOverlayEnabled: runtimeConfig?.metadataOverlayEnabled ?? standaloneFallbackConfig.metadataOverlayEnabled,
  metadataOverlayPosition: runtimeConfig?.metadataOverlayPosition ?? standaloneFallbackConfig.metadataOverlayPosition,
  metadataOverlayShowTitle: runtimeConfig?.metadataOverlayShowTitle ?? standaloneFallbackConfig.metadataOverlayShowTitle,
  metadataOverlayShowYear: runtimeConfig?.metadataOverlayShowYear ?? standaloneFallbackConfig.metadataOverlayShowYear,
  metadataOverlayShowRuntime: runtimeConfig?.metadataOverlayShowRuntime ?? standaloneFallbackConfig.metadataOverlayShowRuntime,
  metadataOverlayShowOfficialRating: runtimeConfig?.metadataOverlayShowOfficialRating ?? standaloneFallbackConfig.metadataOverlayShowOfficialRating,
  metadataOverlayShowCommunityRating: runtimeConfig?.metadataOverlayShowCommunityRating ?? standaloneFallbackConfig.metadataOverlayShowCommunityRating
};

export function normalizeConfig(): void {
  const runtimeAutoScrubMode = String(config.autoScrubMode);
  if (runtimeAutoScrubMode === 'smooth') {
    config.autoScrubMode = AUTO_SCRUB_MODE_SWEEP;
  } else if (runtimeAutoScrubMode === 'smooth-pingpong') {
    config.autoScrubMode = AUTO_SCRUB_MODE_PING_PONG;
  }

  if (!VALID_PREVIEW_SOURCES.has(config.previewSource)) {
    config.previewSource = PREVIEW_SOURCE_TRICKPLAY;
  }

  if (!VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(config.moviePreviewSource)) {
    config.moviePreviewSource = PREVIEW_SOURCE_INHERIT;
  }

  if (!VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(config.seriesPreviewSource)) {
    config.seriesPreviewSource = PREVIEW_SOURCE_INHERIT;
  }

  if (!VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(config.episodePreviewSource)) {
    config.episodePreviewSource = PREVIEW_SOURCE_INHERIT;
  }

  if (!VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(config.videoPreviewSource)) {
    config.videoPreviewSource = PREVIEW_SOURCE_INHERIT;
  }

  if (!VALID_SMART_PRIMARY_SOURCES.has(config.smartMoviePrimarySource)) {
    config.smartMoviePrimarySource = PREVIEW_SOURCE_TRAILER;
  }

  if (!VALID_SMART_PRIMARY_SOURCES.has(config.smartSeriesPrimarySource)) {
    config.smartSeriesPrimarySource = PREVIEW_SOURCE_TRICKPLAY;
  }

  if (!VALID_SMART_PRIMARY_SOURCES.has(config.smartEpisodePrimarySource)) {
    config.smartEpisodePrimarySource = PREVIEW_SOURCE_TRICKPLAY;
  }

  if (!VALID_SMART_PRIMARY_SOURCES.has(config.smartVideoPrimarySource)) {
    config.smartVideoPrimarySource = PREVIEW_SOURCE_TRICKPLAY;
  }

  if (!VALID_SMART_TRAILER_SCOPES.has(config.smartTrailerScope)) {
    config.smartTrailerScope = SMART_TRAILER_SCOPE_LOCAL_AND_REMOTE;
  }

  if (!VALID_TRAILER_EXPAND_BUTTON_POSITIONS.has(config.metadataOverlayPosition)) {
    config.metadataOverlayPosition = 'bottom-left';
  }

  if (!VALID_HOVER_MODES.has(config.hoverMode)) {
    config.hoverMode = HOVER_MODE_SCRUB;
  }

  if (!VALID_AUTO_SCRUB_MODES.has(config.autoScrubMode)) {
    config.autoScrubMode = AUTO_SCRUB_MODE_STEP;
  }

  if (!VALID_AUTO_SCRUB_PRESETS.has(config.autoScrubPreset)) {
    config.autoScrubPreset = AUTO_SCRUB_PRESET_BALANCED;
  }

  if (!VALID_PREVIEW_MODES.has(config.portraitCardPreviewMode)) {
    config.portraitCardPreviewMode = PREVIEW_MODE_CONTAIN;
  }

  if (!VALID_PREVIEW_MODES.has(config.backdropCardPreviewMode)) {
    config.backdropCardPreviewMode = PREVIEW_MODE_COVER;
  }

  if (!VALID_PREVIEW_BACKDROP_MODES.has(config.previewBackdropMode)) {
    config.previewBackdropMode = PREVIEW_BACKDROP_DIM_BLUR;
  }

  if (!VALID_YOUTUBE_CROP_STRENGTHS.has(config.youTubeCropStrength)) {
    config.youTubeCropStrength = YOUTUBE_CROP_MEDIUM;
  }

  if (!VALID_TRAILER_EXPAND_BUTTON_POSITIONS.has(config.trailerExpandButtonPosition)) {
    config.trailerExpandButtonPosition = TRAILER_EXPAND_BUTTON_TOP_RIGHT;
  }

  if (!VALID_TRAILER_EXPAND_BUTTON_POSITIONS.has(config.hoverCountdownPosition)) {
    config.hoverCountdownPosition = TRAILER_EXPAND_BUTTON_TOP_RIGHT;
  }

  config.hoverDelayMs = Math.max(0, Number(config.hoverDelayMs) || 300);
  config.hoverIntentEnabled = config.hoverIntentEnabled === true;
  config.hoverIntentThresholdPx = Math.max(0, Number(config.hoverIntentThresholdPx) || 18);
  config.hoverCooldownMs = Math.max(0, Number(config.hoverCooldownMs) || 0);
  config.metadataOverlayEnabled = config.metadataOverlayEnabled === true;
  config.metadataOverlayShowTitle = config.metadataOverlayShowTitle !== false;
  config.metadataOverlayShowYear = config.metadataOverlayShowYear !== false;
  config.metadataOverlayShowRuntime = config.metadataOverlayShowRuntime !== false;
  config.metadataOverlayShowOfficialRating = config.metadataOverlayShowOfficialRating !== false;
  config.metadataOverlayShowCommunityRating = config.metadataOverlayShowCommunityRating !== false;
  config.trickplayWidth = Math.max(1, Number(config.trickplayWidth) || 320);
  config.trailerVolumePercent = clamp(Number.isFinite(Number(config.trailerVolumePercent)) ? Number(config.trailerVolumePercent) : 35, 0, 100);
  config.previewBackdropIntensityPercent = clamp(Number.isFinite(Number(config.previewBackdropIntensityPercent)) ? Number(config.previewBackdropIntensityPercent) : 35, 0, 100);
  config.autoScrubStartPercent = clamp(Number(config.autoScrubStartPercent) || 0, 0, 100);
  config.autoScrubIntervalMs = Math.max(50, Number(config.autoScrubIntervalMs) || 220);
  config.autoScrubDurationMs = Math.max(500, Number(config.autoScrubDurationMs) || 4000);
  config.autoScrubMinDelayMs = Math.max(16, Number(config.autoScrubMinDelayMs) || 40);
  config.autoScrubMaxDelayMs = Math.max(config.autoScrubMinDelayMs, Number(config.autoScrubMaxDelayMs) || 1000);
  config.showNoPreviewMessage = config.showNoPreviewMessage === true;
  config.hoverCountdownEnabled = config.hoverCountdownEnabled === true;
  config.trailerExpandButtonEnabled = config.trailerExpandButtonEnabled !== false;
}
