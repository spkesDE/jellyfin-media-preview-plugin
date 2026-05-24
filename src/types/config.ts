export type PreviewSource =
  | 'trickplay'
  | 'trailer'
  | 'prefer-trickplay'
  | 'prefer-trailer';

export type HoverMode = 'scrub' | 'auto';
export type AutoScrubMode = 'step' | 'sweep' | 'ping-pong';
export type AutoScrubPreset = 'custom' | 'snappy' | 'balanced' | 'cinematic';
export type PreviewMode = 'cover' | 'contain' | 'stretch';
export type PreviewBackdropMode = 'off' | 'dim' | 'vignette' | 'dim-vignette' | 'blur' | 'dim-blur';
export type YouTubeCropStrength = 'off' | 'light' | 'medium' | 'strong';
export type TrailerExpandButtonPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface PluginConfig {
  enabled: boolean;
  previewSource: PreviewSource;
  showNoPreviewMessage: boolean;
  trailerAudioEnabled: boolean;
  trailerVolumePercent: number;
  hoverDelayMs: number;
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
  youTubeCropStrength: YouTubeCropStrength;
  trailerExpandButtonEnabled: boolean;
  trailerExpandButtonPosition: TrailerExpandButtonPosition;
}

export type RuntimePluginConfig = Partial<PluginConfig> & {
  autoScrubMode?: AutoScrubMode | 'smooth' | 'smooth-pingpong';
};
