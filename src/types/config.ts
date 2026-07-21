export type PreviewSource =
  | 'trickplay'
  | 'trailer'
  | 'prefer-trickplay'
  | 'prefer-trailer';
export type ContentTypePreviewSource = PreviewSource | 'inherit';

export interface LibraryPreviewSourceOverride {
  libraryId: string;
  previewSource: ContentTypePreviewSource;
}

export type HoverMode = 'scrub' | 'auto';
export type AutoScrubMode = 'step' | 'sweep' | 'ping-pong';
export type AutoScrubPreset = 'custom' | 'snappy' | 'balanced' | 'cinematic';
export type PreviewMode = 'cover' | 'contain' | 'stretch';
export type PortraitCardExpansionMode = 'off' | '3:2' | '16:9' | 'source';
export type PortraitCardExpansionLayoutMode = 'all' | 'horizontal-only' | 'compress';
export type PortraitCardCompressionMode = 'distance' | 'neighbors';
export type PreviewBackdropMode = 'off' | 'dim' | 'vignette' | 'dim-vignette' | 'blur' | 'dim-blur';
export type PreviewTransitionMode = 'off' | 'fade' | 'crossfade';
export type YouTubeCropStrength = 'off' | 'light' | 'medium' | 'strong';
export type TrailerExpandButtonPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface PluginConfig {
  enabled: boolean;
  previewSource: PreviewSource;
  moviePreviewSource: ContentTypePreviewSource;
  seriesPreviewSource: ContentTypePreviewSource;
  episodePreviewSource: ContentTypePreviewSource;
  videoPreviewSource: ContentTypePreviewSource;
  libraryPreviewSourceOverrides: LibraryPreviewSourceOverride[];
  showNoPreviewMessage: boolean;
  trailerAudioEnabled: boolean;
  trailerVolumePercent: number;
  unavailableTrailerCacheEnabled: boolean;
  hoverDelayMs: number;
  hoverIntentEnabled: boolean;
  hoverIntentThresholdPx: number;
  hoverCooldownMs: number;
  keyboardPreviewEnabled: boolean;
  keyboardPreviewDelayMs: number;
  keyboardPreviewStartPercent: number;
  keyboardArrowScrubEnabled: boolean;
  keyboardArrowStepPercent: number;
  keyboardEscapeClosesPreview: boolean;
  hoverCountdownEnabled: boolean;
  hoverCountdownPosition: TrailerExpandButtonPosition;
  trickplayWidth: number;
  trickplayPreloadEnabled: boolean;
  trickplayPreloadLimit: number;
  trickplayLoadingIndicatorEnabled: boolean;
  restoreOnLeave: boolean;
  showProgressIndicator: boolean;
  debug: boolean;
  hoverMode: HoverMode;
  autoScrubMode: AutoScrubMode;
  autoScrubPreset: AutoScrubPreset;
  autoScrubStartPercent: number;
  autoScrubIntervalMs: number;
  autoScrubDurationMs: number;
  autoScrubMinDelayMs: number;
  autoScrubMaxDelayMs: number;
  portraitCardPreviewMode: PreviewMode;
  portraitCardExpansionMode: PortraitCardExpansionMode;
  portraitCardExpansionLayoutMode: PortraitCardExpansionLayoutMode;
  portraitCardCompressionMode: PortraitCardCompressionMode;
  portraitCardRowLockEnabled: boolean;
  backdropCardPreviewMode: PreviewMode;
  previewBackdropMode: PreviewBackdropMode;
  previewBackdropIntensityPercent: number;
  previewTransitionMode: PreviewTransitionMode;
  previewTransitionDurationMs: number;
  youTubeCropStrength: YouTubeCropStrength;
  trailerExpandButtonEnabled: boolean;
  trailerExpandButtonPosition: TrailerExpandButtonPosition;
  metadataOverlayEnabled: boolean;
  metadataOverlayPosition: TrailerExpandButtonPosition;
  metadataOverlayShowTitle: boolean;
  metadataOverlayShowYear: boolean;
  metadataOverlayShowRuntime: boolean;
  metadataOverlayShowOfficialRating: boolean;
  metadataOverlayShowCommunityRating: boolean;
}

export type RuntimePluginConfig = Partial<PluginConfig> & {
  autoScrubMode?: AutoScrubMode | 'smooth' | 'smooth-pingpong';
};
