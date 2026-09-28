import { createDefaultConfig, type StoreConfig } from './defaults';
import type { PreviewChainSource } from '../../types/config';
import type { ConfigLibraryOverride, ConfigPreviewFallbackSource } from './types';

const FALLBACK_SOURCES: PreviewChainSource[] = ['trickplay', 'local-trailer', 'remote-trailer', 'direct-play'];

export function normalizeFallbacks(
  value: unknown,
  primary: PreviewChainSource,
  defaults: ConfigPreviewFallbackSource[],
  includePrimary = false
): ConfigPreviewFallbackSource[] {
  const allowed = new Set(FALLBACK_SOURCES.filter((source) => includePrimary || source !== primary));
  const seen = new Set<PreviewChainSource>();
  const normalized: ConfigPreviewFallbackSource[] = [];

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      const record = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
      if (record?.Source === 'trailer') {
        (['local-trailer', 'remote-trailer'] as PreviewChainSource[]).forEach((source) => {
          if (allowed.has(source) && !seen.has(source)) {
            seen.add(source);
            normalized.push({ Source: source, Enabled: record?.Enabled === true });
          }
        });
        return;
      }
      const source = record?.Source as PreviewChainSource;
      if (!allowed.has(source) || seen.has(source)) {
        return;
      }
      seen.add(source);
      normalized.push({ Source: source, Enabled: record?.Enabled === true });
    });
  }

  if (includePrimary && !seen.has(primary)) {
    seen.add(primary);
    normalized.unshift({ Source: primary, Enabled: true });
  }

  defaults.forEach((entry) => {
    if (!seen.has(entry.Source)) {
      normalized.push({ ...entry });
    }
  });
  return normalized;
}

export function normalizeOverrides(value: unknown): ConfigLibraryOverride[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is ConfigLibraryOverride =>
        !!entry && typeof entry.LibraryId === 'string' && typeof entry.PreviewSource === 'string'
    )
    .map((entry) => ({ LibraryId: entry.LibraryId, PreviewSource: entry.PreviewSource }))
    .sort((left, right) => left.LibraryId.localeCompare(right.LibraryId));
}

function cloneConfig(config: StoreConfig): StoreConfig {
  return JSON.parse(JSON.stringify(config)) as StoreConfig;
}

function readConfigObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function loadConfig(value: unknown): StoreConfig {
  const source = readConfigObject(value);
  const defaults = createDefaultConfig();
  return {
    ...defaults,
    ...source,
    LibraryPreviewSourceOverrides: normalizeOverrides(source.LibraryPreviewSourceOverrides),
    PreferTrailerFallbacks: normalizeFallbacks(
      source.PreferTrailerFallbacks,
      'local-trailer',
      defaults.PreferTrailerFallbacks,
      true
    ),
    PreferTrickplayFallbacks: normalizeFallbacks(
      source.PreferTrickplayFallbacks,
      'trickplay',
      defaults.PreferTrickplayFallbacks
    ),
    PreferDirectPlayFallbacks: normalizeFallbacks(
      source.PreferDirectPlayFallbacks,
      'direct-play',
      defaults.PreferDirectPlayFallbacks
    )
  } as StoreConfig;
}

export function createConfigSnapshot(config: StoreConfig): string {
  const snapshot = cloneConfig(config);
  snapshot.LibraryPreviewSourceOverrides = normalizeOverrides(snapshot.LibraryPreviewSourceOverrides);
  const defaults = createDefaultConfig();
  snapshot.PreferTrailerFallbacks = normalizeFallbacks(
    snapshot.PreferTrailerFallbacks,
    'local-trailer',
    defaults.PreferTrailerFallbacks,
    true
  );
  snapshot.PreferTrickplayFallbacks = normalizeFallbacks(
    snapshot.PreferTrickplayFallbacks,
    'trickplay',
    defaults.PreferTrickplayFallbacks
  );
  snapshot.PreferDirectPlayFallbacks = normalizeFallbacks(
    snapshot.PreferDirectPlayFallbacks,
    'direct-play',
    defaults.PreferDirectPlayFallbacks
  );
  return JSON.stringify(snapshot);
}

export function saveConfig(config: StoreConfig): StoreConfig {
  const payload = cloneConfig(config);
  payload.LibraryPreviewSourceOverrides = normalizeOverrides(payload.LibraryPreviewSourceOverrides).filter(
    (entry) => entry.PreviewSource !== 'inherit'
  );
  const defaults = createDefaultConfig();
  payload.PreferTrailerFallbacks = normalizeFallbacks(
    payload.PreferTrailerFallbacks,
    'local-trailer',
    defaults.PreferTrailerFallbacks,
    true
  );
  payload.PreferTrickplayFallbacks = normalizeFallbacks(
    payload.PreferTrickplayFallbacks,
    'trickplay',
    defaults.PreferTrickplayFallbacks
  );
  payload.PreferDirectPlayFallbacks = normalizeFallbacks(
    payload.PreferDirectPlayFallbacks,
    'direct-play',
    defaults.PreferDirectPlayFallbacks
  );
  return payload;
}
