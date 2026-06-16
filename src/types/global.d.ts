import type { RuntimePluginConfig } from './config';
import type { JellyfinApiClient } from './jellyfin';

declare global {
  interface Window {
    JellyfinMediaPreview?: Record<string, unknown>;
    JellyfinMediaPreviewPluginConfig?: RuntimePluginConfig;
    ApiClient?: JellyfinApiClient;
    apiClient?: JellyfinApiClient;
    Dashboard?: {
      showLoadingMsg(): void;
      hideLoadingMsg(): void;
      processPluginConfigurationUpdateResult(result: unknown): void;
    };
  }
}

export {};
