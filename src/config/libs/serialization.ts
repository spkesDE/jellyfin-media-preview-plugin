import { createDefaultConfig, type StoreConfig } from './defaults';
import type { ConfigLibraryOverride } from './types';

export function normalizeOverrides(value: unknown): ConfigLibraryOverride[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is ConfigLibraryOverride =>
      !!entry && typeof entry.LibraryId === 'string' && typeof entry.PreviewSource === 'string'
    )
    .map((entry) => ({ LibraryId: entry.LibraryId, PreviewSource: entry.PreviewSource }))
    .sort((left, right) => left.LibraryId.localeCompare(right.LibraryId));
}

function cloneConfig(config: StoreConfig): StoreConfig {
  return JSON.parse(JSON.stringify(config)) as StoreConfig;
}

function readConfigObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function loadConfig(value: unknown): StoreConfig {
  const source = readConfigObject(value);
  return {
    ...createDefaultConfig(),
    ...source,
    LibraryPreviewSourceOverrides: normalizeOverrides(source.LibraryPreviewSourceOverrides)
  } as StoreConfig;
}

export function createConfigSnapshot(config: StoreConfig): string {
  const snapshot = cloneConfig(config);
  snapshot.LibraryPreviewSourceOverrides = normalizeOverrides(snapshot.LibraryPreviewSourceOverrides);
  return JSON.stringify(snapshot);
}

export function saveConfig(config: StoreConfig): StoreConfig {
  const payload = cloneConfig(config);
  payload.LibraryPreviewSourceOverrides = normalizeOverrides(payload.LibraryPreviewSourceOverrides)
    .filter((entry) => entry.PreviewSource !== 'inherit');
  return payload;
}
