export const STATE_ATTR = 'data-media-preview-bound';
export const STYLE_ID = 'jellyfin-media-preview-style';
export const NAMESPACE = 'JellyfinMediaPreview';
export const PREVIEW_SOURCE_TRICKPLAY = 'trickplay';
export const PREVIEW_SOURCE_TRAILER = 'trailer';
export const PREVIEW_SOURCE_PREFER_TRICKPLAY = 'prefer-trickplay';
export const PREVIEW_SOURCE_PREFER_TRAILER = 'prefer-trailer';
export const PREVIEW_SOURCE_INHERIT = 'inherit';
export const NO_PREVIEW_MESSAGE_TRAILER = 'No Trailer Found';
export const NO_PREVIEW_MESSAGE_TRICKPLAY = 'No Trickplay Found';
export const NO_PREVIEW_MESSAGE_ANY = 'No Trailer/Trickplay Found';
export const HOVER_MODE_SCRUB = 'scrub';
export const HOVER_MODE_AUTO = 'auto';
export const AUTO_SCRUB_MODE_STEP = 'step';
export const AUTO_SCRUB_MODE_SWEEP = 'sweep';
export const AUTO_SCRUB_MODE_PING_PONG = 'ping-pong';
export const AUTO_SCRUB_PRESET_CUSTOM = 'custom';
export const AUTO_SCRUB_PRESET_SNAPPY = 'snappy';
export const AUTO_SCRUB_PRESET_BALANCED = 'balanced';
export const AUTO_SCRUB_PRESET_CINEMATIC = 'cinematic';
export const PREVIEW_MODE_COVER = 'cover';
export const PREVIEW_MODE_CONTAIN = 'contain';
export const PREVIEW_MODE_STRETCH = 'stretch';
export const PREVIEW_BACKDROP_OFF = 'off';
export const PREVIEW_BACKDROP_DIM = 'dim';
export const PREVIEW_BACKDROP_VIGNETTE = 'vignette';
export const PREVIEW_BACKDROP_DIM_VIGNETTE = 'dim-vignette';
export const PREVIEW_BACKDROP_BLUR = 'blur';
export const PREVIEW_BACKDROP_DIM_BLUR = 'dim-blur';
export const YOUTUBE_CROP_OFF = 'off';
export const YOUTUBE_CROP_LIGHT = 'light';
export const YOUTUBE_CROP_MEDIUM = 'medium';
export const YOUTUBE_CROP_STRONG = 'strong';
export const TRAILER_EXPAND_BUTTON_TOP_LEFT = 'top-left';
export const TRAILER_EXPAND_BUTTON_TOP_RIGHT = 'top-right';
export const TRAILER_EXPAND_BUTTON_BOTTOM_LEFT = 'bottom-left';
export const TRAILER_EXPAND_BUTTON_BOTTOM_RIGHT = 'bottom-right';
export const CONFIGURATION_PAGE_NAME = 'MediaPreviewConfigPage';
export const CONFIGURATION_PAGE_HASH = `#/configurationpage?name=${CONFIGURATION_PAGE_NAME}`;
export const ADMIN_NAV_LINK_ATTR = 'data-media-preview-admin-link';
export const DEBUG_LEAVE_HOLD_MS = 30000;
export const EXPANDED_TRAILER_TRANSITION_MS = 240;

export const VALID_PREVIEW_SOURCES = new Set([
  PREVIEW_SOURCE_TRICKPLAY,
  PREVIEW_SOURCE_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_PREFER_TRAILER
] as const);

export const VALID_CONTENT_TYPE_PREVIEW_SOURCES = new Set([
  PREVIEW_SOURCE_INHERIT,
  PREVIEW_SOURCE_TRICKPLAY,
  PREVIEW_SOURCE_TRAILER,
  PREVIEW_SOURCE_PREFER_TRICKPLAY,
  PREVIEW_SOURCE_PREFER_TRAILER
] as const);

export const VALID_HOVER_MODES = new Set([
  HOVER_MODE_SCRUB,
  HOVER_MODE_AUTO
] as const);

export const VALID_AUTO_SCRUB_MODES = new Set([
  AUTO_SCRUB_MODE_STEP,
  AUTO_SCRUB_MODE_SWEEP,
  AUTO_SCRUB_MODE_PING_PONG
] as const);

export const VALID_AUTO_SCRUB_PRESETS = new Set([
  AUTO_SCRUB_PRESET_CUSTOM,
  AUTO_SCRUB_PRESET_SNAPPY,
  AUTO_SCRUB_PRESET_BALANCED,
  AUTO_SCRUB_PRESET_CINEMATIC
] as const);

export const VALID_PREVIEW_MODES = new Set([
  PREVIEW_MODE_COVER,
  PREVIEW_MODE_CONTAIN,
  PREVIEW_MODE_STRETCH
] as const);

export const VALID_PREVIEW_BACKDROP_MODES = new Set([
  PREVIEW_BACKDROP_OFF,
  PREVIEW_BACKDROP_DIM,
  PREVIEW_BACKDROP_VIGNETTE,
  PREVIEW_BACKDROP_DIM_VIGNETTE,
  PREVIEW_BACKDROP_BLUR,
  PREVIEW_BACKDROP_DIM_BLUR
] as const);

export const VALID_YOUTUBE_CROP_STRENGTHS = new Set([
  YOUTUBE_CROP_OFF,
  YOUTUBE_CROP_LIGHT,
  YOUTUBE_CROP_MEDIUM,
  YOUTUBE_CROP_STRONG
] as const);

export const VALID_TRAILER_EXPAND_BUTTON_POSITIONS = new Set([
  TRAILER_EXPAND_BUTTON_TOP_LEFT,
  TRAILER_EXPAND_BUTTON_TOP_RIGHT,
  TRAILER_EXPAND_BUTTON_BOTTOM_LEFT,
  TRAILER_EXPAND_BUTTON_BOTTOM_RIGHT
] as const);

export const SUPPORTED_TYPES = new Set(['Movie', 'Episode', 'Series', 'Video']);
