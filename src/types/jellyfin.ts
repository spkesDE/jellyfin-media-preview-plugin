export interface JellyfinMediaStream {
  Type?: string | number;
  Width?: number;
  Height?: number;
}

export interface JellyfinMediaSource {
  Id?: string;
  Container?: string;
  MediaStreams?: JellyfinMediaStream[];
}

export interface JellyfinRemoteTrailer {
  Name?: string;
  Url?: string;
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
  LocalTrailerCount?: number;
  RemoteTrailers?: JellyfinRemoteTrailer[];
  MediaSources?: JellyfinMediaSource[];
  Trickplay?: Record<string, Record<string, JellyfinTrickplayManifest>>;
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
  type: 'GET';
  url: string;
  dataType: 'json';
}

export interface JellyfinServerInfo {
  UserId?: string;
  AccessToken?: string;
  ManualAddress?: string;
}

export interface JellyfinApiClient {
  accessToken?: (() => string | undefined) | string;
  _serverInfo?: JellyfinServerInfo;
  _serverAddress?: string;
  getCurrentUserId?: () => string | null | undefined;
  getCurrentUser?: () => JellyfinCurrentUser | null | undefined;
  getUrl?: (path: string, query?: Record<string, string | number | boolean | null | undefined>) => string | null;
  serverAddress?: () => string | null | undefined;
  ajax?: (request: JellyfinAjaxRequest) => Promise<unknown> | unknown;
}
