import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../../src/config/libs/defaults';
import { loadConfig } from '../../src/config/libs/serialization';

describe('preferred source serialization', () => {
  it('migrates an aggregate trailer fallback into local and remote trailer steps', () => {
    const config = loadConfig({
      ...createDefaultConfig(),
      PreferDirectPlayFallbacks: [
        { Source: 'trailer', Enabled: true },
        { Source: 'trickplay', Enabled: false }
      ]
    });

    expect(config.PreferDirectPlayFallbacks).toEqual([
      { Source: 'local-trailer', Enabled: true },
      { Source: 'remote-trailer', Enabled: true },
      { Source: 'trickplay', Enabled: false }
    ]);
  });

  it('migrates legacy Prefer Trailer settings and preserves Remote Trailer at position one', () => {
    const legacy = loadConfig({
      ...createDefaultConfig(),
      PreferTrailerFallbacks: [
        { Source: 'remote-trailer', Enabled: true },
        { Source: 'direct-play', Enabled: true },
        { Source: 'trickplay', Enabled: false }
      ]
    });
    expect(legacy.PreferTrailerFallbacks[0]).toEqual({ Source: 'local-trailer', Enabled: true });

    const remoteFirst = loadConfig({
      ...createDefaultConfig(),
      PreferTrailerFallbacks: [
        { Source: 'remote-trailer', Enabled: true },
        { Source: 'local-trailer', Enabled: true },
        { Source: 'direct-play', Enabled: true },
        { Source: 'trickplay', Enabled: false }
      ]
    });
    expect(remoteFirst.PreferTrailerFallbacks.slice(0, 2)).toEqual([
      { Source: 'remote-trailer', Enabled: true },
      { Source: 'local-trailer', Enabled: true }
    ]);
  });
});

describe('source-specific media control serialization', () => {
  it('defaults both control groups to every playable preview source', () => {
    const config = loadConfig({});

    expect(config.VideoControlSources).toEqual(['local-trailer', 'remote-trailer', 'direct-play']);
    expect(config.AudioControlSources).toEqual(['local-trailer', 'remote-trailer', 'direct-play']);
  });

  it('keeps the selected order while removing invalid and duplicate sources', () => {
    const config = loadConfig({
      VideoControlSources: ['direct-play', 'invalid', 'local-trailer', 'direct-play'],
      AudioControlSources: ['remote-trailer']
    });

    expect(config.VideoControlSources).toEqual(['direct-play', 'local-trailer']);
    expect(config.AudioControlSources).toEqual(['remote-trailer']);
  });
});
