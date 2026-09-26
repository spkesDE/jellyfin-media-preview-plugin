import type { PreviewMode } from './config';

export interface AspectRatio {
  width: number;
  height: number;
}

export interface TrickplayInfo {
  itemId: string;
  mediaSourceId: string | null;
  width: number;
  manifestKey: string;
  frameWidth: number;
  frameHeight: number;
  tilesPerRow: number;
  tilesPerColumn: number;
  thumbnailCount: number;
  intervalMs: number;
  totalFramesPerTile: number;
  type?: string;
}

export interface TrailerCandidate {
  provider: 'youtube' | 'remote-video' | 'local-trailer' | 'direct-play';
  kind: 'iframe' | 'video';
  title: string;
  src?: string;
  fallbackSrc?: string | null;
  embedUrl?: string | null;
  youtubeId?: string | null;
  startSeconds?: number;
  aspectRatio: AspectRatio;
}

export interface TrailerInfo {
  itemId: string;
  candidates: TrailerCandidate[];
}

export interface MetadataOverlayInfo {
  itemId: string;
  title: string | null;
  year: number | null;
  runtimeTicks: number | null;
  officialRating: string | null;
  communityRating: number | null;
}

export interface TrickplayPreview {
  source: 'trickplay';
  info: TrickplayInfo;
  percent: number;
  frameIndex: number;
  tileIndex: number;
  tileUrl: string | null;
  frameColumn: number;
  frameRow: number;
}

export interface TrailerPreview {
  source: 'trailer';
  itemId: string;
  trailer: TrailerCandidate;
  info: {
    frameWidth: number;
    frameHeight: number;
  };
}

export interface DirectPlayPreview {
  source: 'direct-play';
  itemId: string;
  trailer: TrailerCandidate;
  info: {
    frameWidth: number;
    frameHeight: number;
  };
}

export type VideoPreview = TrailerPreview | DirectPlayPreview;
export type PreviewResult = TrickplayPreview | VideoPreview;

export interface ExpandedTrailerDom {
  overlay: HTMLDivElement;
  viewport: HTMLDivElement;
  mediaHost: HTMLDivElement;
  title: HTMLDivElement;
  onKeyDown: (event: KeyboardEvent) => void;
  onResize: () => void;
}

export interface ExpandedTrailerSession {
  card: HTMLElement;
  state: import('./state').CardState;
  trailer: TrailerCandidate;
  expandedMedia: HTMLIFrameElement | null;
  expandedPlaybackStartedAt: number;
  collapsedMedia: HTMLVideoElement | HTMLIFrameElement | null;
  sourceRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface MediaLayoutRequest {
  layer: HTMLElement;
  mediaElement: HTMLVideoElement | HTMLIFrameElement;
  hostRect: DOMRect | { width: number; height: number };
  mode: PreviewMode;
  sourceWidth: number;
  sourceHeight: number;
  rootBorderRadius: string;
}
