import type {
  AutoScrubMode,
  AutoScrubPreset,
  ContentTypePreviewSource,
  HoverMode,
  PreviewBackdropMode,
  PreviewMode,
  PortraitCardExpansionMode,
  PreviewSource,
  PreviewTransitionMode,
  TrailerExpandButtonPosition,
  YouTubeCropStrength
} from '../../types/config';
import type { AppearancePreview, ConfigLibraryOverride } from './types';

export type StoreConfigValue = string | number | boolean | unknown[];

export const CONFIG_DEFAULTS = {
  Enabled: true,
  PreviewSource: 'trickplay' as PreviewSource,
  MoviePreviewSource: 'inherit' as ContentTypePreviewSource,
  SeriesPreviewSource: 'inherit' as ContentTypePreviewSource,
  EpisodePreviewSource: 'inherit' as ContentTypePreviewSource,
  VideoPreviewSource: 'inherit' as ContentTypePreviewSource,
  LibraryPreviewSourceOverrides: [] as ConfigLibraryOverride[],
  ShowNoPreviewMessage: false,
  TrailerAudioEnabled: false,
  TrailerVolumePercent: 35,
  YouTubeCropStrength: 'medium' as YouTubeCropStrength,
  TrailerExpandButtonEnabled: true,
  TrailerExpandButtonPosition: 'top-right' as TrailerExpandButtonPosition,
  HoverMode: 'scrub' as HoverMode,
  HoverDelayMs: 300,
  HoverIntentEnabled: false,
  HoverIntentThresholdPx: 18,
  HoverCooldownMs: 0,
  KeyboardPreviewEnabled: false,
  KeyboardPreviewDelayMs: 300,
  KeyboardPreviewStartPercent: 50,
  KeyboardArrowScrubEnabled: true,
  KeyboardArrowStepPercent: 8,
  KeyboardEscapeClosesPreview: true,
  HoverCountdownEnabled: false,
  HoverCountdownPosition: 'top-right' as TrailerExpandButtonPosition,
  TrickplayWidth: 320,
  TrickplayPreloadEnabled: false,
  TrickplayPreloadLimit: 2,
  TrickplayLoadingIndicatorEnabled: true,
  AutoScrubStartPercent: 0,
  AutoScrubMode: 'step' as AutoScrubMode,
  AutoScrubPreset: 'balanced' as AutoScrubPreset,
  AutoScrubIntervalMs: 220,
  AutoScrubDurationMs: 4000,
  AutoScrubMinDelayMs: 40,
  AutoScrubMaxDelayMs: 1000,
  PortraitCardPreviewMode: 'contain' as PreviewMode,
  PortraitCardExpansionMode: 'off' as PortraitCardExpansionMode,
  BackdropCardPreviewMode: 'cover' as PreviewMode,
  PreviewBackdropMode: 'dim-blur' as PreviewBackdropMode,
  PreviewBackdropIntensityPercent: 35,
  PreviewTransitionMode: 'fade' as PreviewTransitionMode,
  PreviewTransitionDurationMs: 180,
  RestoreOnLeave: true,
  ShowProgressIndicator: true,
  MetadataOverlayEnabled: false,
  MetadataOverlayPosition: 'bottom-left' as TrailerExpandButtonPosition,
  MetadataOverlayShowTitle: true,
  MetadataOverlayShowYear: true,
  MetadataOverlayShowRuntime: true,
  MetadataOverlayShowOfficialRating: true,
  MetadataOverlayShowCommunityRating: true,
  Debug: false
} satisfies Record<string, StoreConfigValue>;

export type StoreConfig = {
  [Key in keyof typeof CONFIG_DEFAULTS]: typeof CONFIG_DEFAULTS[Key];
} & Record<string, StoreConfigValue>;

export function createDefaultConfig(): StoreConfig {
  return JSON.parse(JSON.stringify(CONFIG_DEFAULTS)) as StoreConfig;
}

export function createDefaultAppearancePreview(): AppearancePreview {
  return {
    title: 'Example Movie',
    year: '2026',
    runtime: '1h 42m',
    officialRating: 'PG-13',
    communityRating: '8.2\u2605',
    posterUrl: '',
    previewUrl: ''
  };
}
