export type PreviewSource =
  | 'trickplay'
  | 'trailer'
  | 'prefer-trickplay'
  | 'prefer-trailer'
  | 'smart';
export type ContentTypePreviewSource = PreviewSource | 'inherit';
export type SmartPrimarySource = 'trickplay' | 'trailer';
export type SmartTrailerScope = 'local-only' | 'local-and-remote';

export type HoverMode = 'scrub' | 'auto';
export type AutoScrubMode = 'step' | 'sweep' | 'ping-pong';
export type AutoScrubPreset = 'custom' | 'snappy' | 'balanced' | 'cinematic';
export type PreviewMode = 'cover' | 'contain' | 'stretch';
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
  showNoPreviewMessage: boolean;
  trailerAudioEnabled: boolean;
  trailerVolumePercent: number;
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
  backdropCardPreviewMode: PreviewMode;
  previewBackdropMode: PreviewBackdropMode;
  previewBackdropIntensityPercent: number;
  previewTransitionMode: PreviewTransitionMode;
  previewTransitionDurationMs: number;
  youTubeCropStrength: YouTubeCropStrength;
  trailerExpandButtonEnabled: boolean;
  trailerExpandButtonPosition: TrailerExpandButtonPosition;
  smartMoviePrimarySource: SmartPrimarySource;
  smartSeriesPrimarySource: SmartPrimarySource;
  smartEpisodePrimarySource: SmartPrimarySource;
  smartVideoPrimarySource: SmartPrimarySource;
  smartTrailerScope: SmartTrailerScope;
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
