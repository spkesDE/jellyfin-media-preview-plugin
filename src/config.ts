import {
  AUTO_SCRUB_MODE_PING_PONG,
  AUTO_SCRUB_MODE_STEP,
  AUTO_SCRUB_MODE_SWEEP,
  AUTO_SCRUB_PRESET_BALANCED,
  HOVER_MODE_SCRUB,
  PREVIEW_BACKDROP_DIM_BLUR,
  PREVIEW_MODE_CONTAIN,
  PREVIEW_MODE_COVER,
  PREVIEW_SOURCE_TRICKPLAY,
  TRAILER_EXPAND_BUTTON_TOP_RIGHT,
  VALID_AUTO_SCRUB_MODES,
  VALID_AUTO_SCRUB_PRESETS,
  VALID_HOVER_MODES,
  VALID_PREVIEW_BACKDROP_MODES,
  VALID_PREVIEW_MODES,
  VALID_PREVIEW_SOURCES,
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
  showNoPreviewMessage: false,
  trailerAudioEnabled: false,
  trailerVolumePercent: 35,
  hoverDelayMs: 300,
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
  trailerExpandButtonPosition: 'top-right'
};

const runtimeConfig: RuntimePluginConfig | undefined = window.JellyfinMediaPreviewPluginConfig;

export const config: PluginConfig = {
  enabled: runtimeConfig?.enabled ?? standaloneFallbackConfig.enabled,
  previewSource: runtimeConfig?.previewSource ?? standaloneFallbackConfig.previewSource,
  showNoPreviewMessage: runtimeConfig?.showNoPreviewMessage ?? standaloneFallbackConfig.showNoPreviewMessage,
  trailerAudioEnabled: runtimeConfig?.trailerAudioEnabled ?? standaloneFallbackConfig.trailerAudioEnabled,
  trailerVolumePercent: runtimeConfig?.trailerVolumePercent ?? standaloneFallbackConfig.trailerVolumePercent,
  hoverDelayMs: runtimeConfig?.hoverDelayMs ?? standaloneFallbackConfig.hoverDelayMs,
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
  trailerExpandButtonPosition: runtimeConfig?.trailerExpandButtonPosition ?? standaloneFallbackConfig.trailerExpandButtonPosition
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
