import {
  computed,
  inject,
  reactive,
  ref,
  type ComputedRef,
  type InjectionKey,
  type Ref
} from 'vue';
import { getGlobalApiClient } from '../../core/apiClient';
import type { ContentTypePreviewSource, PreviewSource } from '../../types/config';
import { loadAppearancePreview } from './appearanceApi';
import { createDefaultAppearancePreview, createDefaultConfig, type StoreConfig } from './defaults';
import { loadLibraries } from './jellyfinApi';
import {
  createConfigSnapshot,
  loadConfig as loadPluginConfig,
  saveConfig as createSaveConfigPayload
} from './serialization';
import type {
  AppearancePreview,
  ConfigLibrary,
  ConfigTab,
  SaveState
} from './types';

const PLUGIN_ID = '2c2ee6c1-bcd7-48e4-a7e8-e6b4d77d3df2';

function modeUsesTrailer(mode: PreviewSource): boolean {
  return mode !== 'trickplay';
}

function modeUsesTrickplay(mode: PreviewSource): boolean {
  return mode !== 'trailer';
}

export interface ConfigStore {
  config: StoreConfig;
  libraries: Ref<ConfigLibrary[]>;
  appearance: Ref<AppearancePreview>;
  activeTab: Ref<ConfigTab>;
  loading: Ref<boolean>;
  saveState: ComputedRef<SaveState>;
  canUseTrailer: ComputedRef<boolean>;
  canUseTrickplay: ComputedRef<boolean>;
  previewSourceNote: ComputedRef<string>;
  motionProfile: ComputedRef<{ glyph: string; title: string; text: string }>;
  presetValues: ComputedRef<{ min: number; max: number; duration: number }>;
  loadConfig(): Promise<void>;
  saveConfig(): Promise<void>;
  selectTab(tab: ConfigTab): void;
  setLibraryOverride(libraryId: string, value: ContentTypePreviewSource): void;
  getLibraryOverride(libraryId: string): ContentTypePreviewSource;
  markAutoPresetCustom(): void;
}

export function createConfigStore(): ConfigStore {
  const config = reactive(createDefaultConfig()) as StoreConfig;
  const libraries = ref<ConfigLibrary[]>([]);
  const appearance = ref<AppearancePreview>(createDefaultAppearancePreview());
  const activeTab = ref<ConfigTab>('general');
  const loading = ref(false);
  const lastSavedSnapshot = ref(createConfigSnapshot(config));
  const savedFeedback = ref(false);
  let saveFeedbackTimer: number | null = null;

  const configuredModes = computed<PreviewSource[]>(() => {
    const modes: PreviewSource[] = [config.PreviewSource];
    [
      config.MoviePreviewSource,
      config.SeriesPreviewSource,
      config.EpisodePreviewSource,
      config.VideoPreviewSource,
      ...config.LibraryPreviewSourceOverrides.map((entry) => entry.PreviewSource)
    ].forEach((mode) => {
      if (mode !== 'inherit') {
        modes.push(mode);
      }
    });
    return modes;
  });

  const canUseTrailer = computed(() => configuredModes.value.some(modeUsesTrailer));
  const canUseTrickplay = computed(() => configuredModes.value.some(modeUsesTrickplay));
  const isDirty = computed(() => createConfigSnapshot(config) !== lastSavedSnapshot.value);
  const saveState = computed<SaveState>(() =>
    savedFeedback.value && !isDirty.value ? 'saved' : isDirty.value ? 'dirty' : 'clean'
  );

  const previewSourceNote = computed(() => ({
    trailer: 'Only Trailer: local trailer first, then supported remote trailer. No Trickplay fallback.',
    trickplay: 'Only Trickplay: always use Jellyfin scrub images.',
    'prefer-trailer': 'Prefer Trailer: local trailer, then supported remote trailer, then Trickplay.',
    'prefer-trickplay': 'Prefer Trickplay: Trickplay first, then trailer if needed.'
  })[config.PreviewSource]);

  const motionProfile = computed(() => ({
    step: { glyph: '1', title: 'Frame by Frame', text: 'Advances one Trickplay frame at a time.' },
    sweep: { glyph: '>', title: 'Continuous', text: 'Allows frame skips when needed so motion stays fluid.' },
    'ping-pong': { glyph: '<>', title: 'Continuous Ping-Pong', text: 'Uses continuous motion while sweeping back and forth.' }
  })[config.AutoScrubMode]);

  const presetValues = computed(() => {
    if (config.AutoScrubPreset === 'custom') {
      return {
        min: config.AutoScrubMinDelayMs,
        max: config.AutoScrubMaxDelayMs,
        duration: config.AutoScrubDurationMs
      };
    }

    return {
      snappy: { min: 24, max: 120, duration: 1800 },
      balanced: { min: 60, max: 520, duration: 6500 },
      cinematic: { min: 180, max: 1400, duration: 14000 }
    }[config.AutoScrubPreset];
  });

  async function loadConfig(): Promise<void> {
    const apiClient = getGlobalApiClient();
    if (!apiClient?.getPluginConfiguration) {
      return;
    }

    loading.value = true;
    window.Dashboard?.showLoadingMsg();
    try {
      const [serverConfig, loadedLibraries] = await Promise.all([
        apiClient.getPluginConfiguration(PLUGIN_ID),
        loadLibraries()
      ]);
      Object.assign(config, loadPluginConfig(serverConfig));
      libraries.value = loadedLibraries;
      lastSavedSnapshot.value = createConfigSnapshot(config);
      savedFeedback.value = false;

      const preview = await loadAppearancePreview();
      if (preview) {
        appearance.value = preview;
      }
    } finally {
      loading.value = false;
      window.Dashboard?.hideLoadingMsg();
    }
  }

  async function saveConfig(): Promise<void> {
    const apiClient = getGlobalApiClient();
    if (!apiClient?.updatePluginConfiguration) {
      return;
    }

    loading.value = true;
    window.Dashboard?.showLoadingMsg();
    try {
      const payload = createSaveConfigPayload(config);
      const result = await apiClient.updatePluginConfiguration(PLUGIN_ID, payload);
      lastSavedSnapshot.value = createConfigSnapshot(config);
      savedFeedback.value = true;
      if (saveFeedbackTimer) {
        window.clearTimeout(saveFeedbackTimer);
      }
      saveFeedbackTimer = window.setTimeout(() => {
        savedFeedback.value = false;
        saveFeedbackTimer = null;
      }, 1400);
      window.Dashboard?.processPluginConfigurationUpdateResult(result);
    } finally {
      loading.value = false;
      window.Dashboard?.hideLoadingMsg();
    }
  }

  function selectTab(tab: ConfigTab): void {
    if ((tab === 'trailer' && !canUseTrailer.value) || (tab === 'trickplay' && !canUseTrickplay.value)) {
      activeTab.value = 'general';
      return;
    }
    activeTab.value = tab;
  }

  function getLibraryOverride(libraryId: string): ContentTypePreviewSource {
    return config.LibraryPreviewSourceOverrides.find((entry) => entry.LibraryId === libraryId)?.PreviewSource
      ?? 'inherit';
  }

  function setLibraryOverride(libraryId: string, value: ContentTypePreviewSource): void {
    const existing = config.LibraryPreviewSourceOverrides.find((entry) => entry.LibraryId === libraryId);
    if (existing) {
      existing.PreviewSource = value;
      return;
    }
    config.LibraryPreviewSourceOverrides.push({ LibraryId: libraryId, PreviewSource: value });
  }

  function markAutoPresetCustom(): void {
    config.AutoScrubPreset = 'custom';
  }

  return {
    config,
    libraries,
    appearance,
    activeTab,
    loading,
    saveState,
    canUseTrailer,
    canUseTrickplay,
    previewSourceNote,
    motionProfile,
    presetValues,
    loadConfig,
    saveConfig,
    selectTab,
    setLibraryOverride,
    getLibraryOverride,
    markAutoPresetCustom
  };
}

export const configStoreKey: InjectionKey<ConfigStore> = Symbol('media-preview-config-store');

export function useConfigStore(): ConfigStore {
  const store = inject(configStoreKey);
  if (!store) {
    throw new Error('Media Preview configuration store was not provided.');
  }
  return store;
}
