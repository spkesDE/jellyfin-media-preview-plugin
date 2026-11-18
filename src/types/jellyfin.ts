export interface JellyfinMediaStream {
  Type?: string | number;
  Width?: number;
  Height?: number;
}

export interface JellyfinMediaSource {
  Id?: string;
  Container?: string;
  MediaStreams?: JellyfinMediaStream[];
  SupportsDirectPlay?: boolean;
  SupportsDirectStream?: boolean;
  SupportsTranscoding?: boolean;
  TranscodingUrl?: string | null;
  TranscodingSubProtocol?: string | null;
}

export interface JellyfinPlaybackInfoResponse {
  MediaSources?: JellyfinMediaSource[];
  PlaySessionId?: string | null;
  ErrorCode?: string | null;
}

export interface JellyfinRemoteTrailer {
  Name?: string;
  Url?: string;
}

export interface JellyfinUserData {
  PlaybackPositionTicks?: number;
  Played?: boolean;
}

export interface JellyfinItem {
  Id?: string;
  Name?: string;
  Type?: string;
  CollectionType?: string;
  ProductionYear?: number;
  RunTimeTicks?: number;
  OfficialRating?: string;
  CommunityRating?: number;
  ImageTags?: {
    Primary?: string;
  };
  BackdropImageTags?: string[];
  LocalTrailerCount?: number;
  RemoteTrailers?: JellyfinRemoteTrailer[];
  MediaSources?: JellyfinMediaSource[];
  Trickplay?: Record<string, Record<string, JellyfinTrickplayManifest>>;
  UserData?: JellyfinUserData;
}

export interface JellyfinItemsResult {
  Items?: JellyfinItem[];
}

export interface JellyfinTrickplayManifest {
  Width?: number;
  Height?: number;
  TileWidth?: number;
  TileHeight?: number;
  ThumbnailCount?: number;
  Interval?: number;
}

export interface JellyfinCurrentUser {
  Id?: string;
}

export interface JellyfinAjaxRequest {
  type: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  dataType?: 'json';
  contentType?: 'application/json';
  data?: string;
}

export interface JellyfinServerInfo {
  Id?: string;
  UserId?: string;
  AccessToken?: string;
  ManualAddress?: string;
}

export interface JellyfinApiClient {
  accessToken?: (() => string | undefined) | string;
  deviceId?: () => string | null | undefined;
  _serverInfo?: JellyfinServerInfo;
  _serverAddress?: string;
  getCurrentUserId?: () => string | null | undefined;
  getCurrentUser?: () => JellyfinCurrentUser | null | undefined;
  getUrl?: (path: string, query?: Record<string, string | number | boolean | null | undefined>) => string | null;
  serverAddress?: () => string | null | undefined;
  ajax?: (request: JellyfinAjaxRequest) => Promise<unknown> | unknown;
  getPluginConfiguration?: (pluginId: string) => Promise<unknown>;
  updatePluginConfiguration?: (pluginId: string, config: unknown) => Promise<unknown>;
  getImageUrl?: (
    itemId: string,
    options: {
      type: string;
      tag: string;
      maxWidth: number;
      quality: number;
      index?: number;
    }
  ) => string | null;
}
