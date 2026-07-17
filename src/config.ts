import {
  AUTO_SCRUB_MODE_PING_PONG,
  AUTO_SCRUB_MODE_STEP,
  AUTO_SCRUB_MODE_SWEEP,
  AUTO_SCRUB_PRESET_BALANCED,
  HOVER_MODE_SCRUB,
  PREVIEW_SOURCE_INHERIT,
  PREVIEW_BACKDROP_DIM_BLUR,
  PREVIEW_MODE_CONTAIN,
  PREVIEW_MODE_COVER,
  PREVIEW_TRANSITION_FADE,
  PREVIEW_SOURCE_TRICKPLAY,
  PREVIEW_SOURCE_TRAILER,
  TRAILER_EXPAND_BUTTON_TOP_RIGHT,
  VALID_CONTENT_TYPE_PREVIEW_SOURCES,
  VALID_AUTO_SCRUB_MODES,
  VALID_AUTO_SCRUB_PRESETS,
  VALID_HOVER_MODES,
  VALID_PREVIEW_BACKDROP_MODES,
  VALID_PREVIEW_MODES,
  VALID_PREVIEW_SOURCES,
  VALID_PREVIEW_TRANSITION_MODES,
  VALID_TRAILER_EXPAND_BUTTON_POSITIONS,
  VALID_YOUTUBE_CROP_STRENGTHS,
  YOUTUBE_CROP_MEDIUM
} from './constants';
import { clamp } from './core/dom';
import type { LibraryPreviewSourceOverride, PluginConfig, RuntimePluginConfig } from './types/config';

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
  libraryPreviewSourceOverrides: [],
  showNoPreviewMessage: false,
  trailerAudioEnabled: false,
  trailerVolumePercent: 35,
  hoverDelayMs: 300,
  hoverIntentEnabled: false,
  hoverIntentThresholdPx: 18,
  hoverCooldownMs: 0,
  keyboardPreviewEnabled: false,
  keyboardPreviewDelayMs: 300,
  keyboardPreviewStartPercent: 50,
  keyboardArrowScrubEnabled: true,
  keyboardArrowStepPercent: 8,
  keyboardEscapeClosesPreview: true,
  hoverCountdownEnabled: false,
  hoverCountdownPosition: 'top-right',
  trickplayWidth: 320,
  trickplayPreloadEnabled: false,
  trickplayPreloadLimit: 2,
  trickplayLoadingIndicatorEnabled: true,
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
  portraitCardExpansionMode: 'off',
  backdropCardPreviewMode: 'cover',
  previewBackdropMode: 'dim-blur',
  previewBackdropIntensityPercent: 35,
  previewTransitionMode: PREVIEW_TRANSITION_FADE,
  previewTransitionDurationMs: 180,
  youTubeCropStrength: 'medium',
  trailerExpandButtonEnabled: true,
  trailerExpandButtonPosition: 'top-right',
  metadataOverlayEnabled: false,
  metadataOverlayPosition: 'bottom-left',
  metadataOverlayShowTitle: true,
  metadataOverlayShowYear: true,
  metadataOverlayShowRuntime: true,
  metadataOverlayShowOfficialRating: true,
  metadataOverlayShowCommunityRating: true
};

const runtimeConfig: RuntimePluginConfig | undefined = window.JellyfinMediaPreviewPluginConfig;

function numberOrFallback(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config: PluginConfig = {
  ...standaloneFallbackConfig,
  ...runtimeConfig
} as PluginConfig;

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

  config.libraryPreviewSourceOverrides = Array.isArray(config.libraryPreviewSourceOverrides)
    ? normalizeLibraryPreviewSourceOverrides(config.libraryPreviewSourceOverrides)
    : [];

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

  if (!['off', '3:2', '16:9', 'source'].includes(config.portraitCardExpansionMode)) {
    config.portraitCardExpansionMode = 'off';
  }

  if (!VALID_PREVIEW_MODES.has(config.backdropCardPreviewMode)) {
    config.backdropCardPreviewMode = PREVIEW_MODE_COVER;
  }

  if (!VALID_PREVIEW_BACKDROP_MODES.has(config.previewBackdropMode)) {
    config.previewBackdropMode = PREVIEW_BACKDROP_DIM_BLUR;
  }

  if (!VALID_PREVIEW_TRANSITION_MODES.has(config.previewTransitionMode)) {
    config.previewTransitionMode = PREVIEW_TRANSITION_FADE;
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

  config.hoverDelayMs = Math.max(0, numberOrFallback(config.hoverDelayMs, 300));
  config.hoverIntentEnabled = config.hoverIntentEnabled === true;
  config.hoverIntentThresholdPx = Math.max(0, numberOrFallback(config.hoverIntentThresholdPx, 18));
  config.hoverCooldownMs = Math.max(0, numberOrFallback(config.hoverCooldownMs, 0));
  config.keyboardPreviewEnabled = config.keyboardPreviewEnabled === true;
  config.keyboardPreviewDelayMs = Math.max(0, numberOrFallback(config.keyboardPreviewDelayMs, 300));
  config.keyboardPreviewStartPercent = clamp(numberOrFallback(config.keyboardPreviewStartPercent, 0), 0, 100);
  config.keyboardArrowScrubEnabled = config.keyboardArrowScrubEnabled !== false;
  config.keyboardArrowStepPercent = clamp(numberOrFallback(config.keyboardArrowStepPercent, 8), 1, 100);
  config.keyboardEscapeClosesPreview = config.keyboardEscapeClosesPreview !== false;
  config.metadataOverlayEnabled = config.metadataOverlayEnabled === true;
  config.metadataOverlayShowTitle = config.metadataOverlayShowTitle !== false;
  config.metadataOverlayShowYear = config.metadataOverlayShowYear !== false;
  config.metadataOverlayShowRuntime = config.metadataOverlayShowRuntime !== false;
  config.metadataOverlayShowOfficialRating = config.metadataOverlayShowOfficialRating !== false;
  config.metadataOverlayShowCommunityRating = config.metadataOverlayShowCommunityRating !== false;
  config.trickplayWidth = Math.max(1, numberOrFallback(config.trickplayWidth, 320));
  config.trickplayPreloadEnabled = config.trickplayPreloadEnabled === true;
  config.trickplayPreloadLimit = numberOrFallback(config.trickplayPreloadLimit, 2);
  config.trickplayLoadingIndicatorEnabled = config.trickplayLoadingIndicatorEnabled !== false;
  config.trailerVolumePercent = clamp(numberOrFallback(config.trailerVolumePercent, 35), 0, 100);
  config.previewBackdropIntensityPercent = clamp(numberOrFallback(config.previewBackdropIntensityPercent, 35), 0, 100);
  config.previewTransitionDurationMs = Math.max(0, numberOrFallback(config.previewTransitionDurationMs, 180));
  config.autoScrubStartPercent = clamp(numberOrFallback(config.autoScrubStartPercent, 0), 0, 100);
  config.autoScrubIntervalMs = Math.max(50, numberOrFallback(config.autoScrubIntervalMs, 220));
  config.autoScrubDurationMs = Math.max(500, numberOrFallback(config.autoScrubDurationMs, 4000));
  config.autoScrubMinDelayMs = Math.max(16, numberOrFallback(config.autoScrubMinDelayMs, 40));
  config.autoScrubMaxDelayMs = Math.max(config.autoScrubMinDelayMs, numberOrFallback(config.autoScrubMaxDelayMs, 1000));
  config.showNoPreviewMessage = config.showNoPreviewMessage === true;
  config.hoverCountdownEnabled = config.hoverCountdownEnabled === true;
  config.trailerExpandButtonEnabled = config.trailerExpandButtonEnabled !== false;
}

function normalizeLibraryPreviewSourceOverrides(
  overrides: LibraryPreviewSourceOverride[]
): LibraryPreviewSourceOverride[] {
  const normalized = new Map<string, LibraryPreviewSourceOverride>();

  overrides.forEach((entry) => {
    const libraryId = String(entry?.libraryId || '').trim();
    if (!libraryId) {
      return;
    }

    const previewSource = VALID_CONTENT_TYPE_PREVIEW_SOURCES.has(entry?.previewSource)
      ? entry.previewSource
      : PREVIEW_SOURCE_INHERIT;

    normalized.set(libraryId, {
      libraryId,
      previewSource
    });
  });

  return Array.from(normalized.values());
}
