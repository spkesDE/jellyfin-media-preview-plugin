import type { RuntimePluginConfig } from './config';
import type { JellyfinApiClient } from './jellyfin';

declare global {
  interface Window {
    JellyfinMediaPreview?: Record<string, unknown>;
    JellyfinMediaPreviewPluginConfig?: RuntimePluginConfig;
    ApiClient?: JellyfinApiClient;
    apiClient?: JellyfinApiClient;
  }
}

export {};
