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
