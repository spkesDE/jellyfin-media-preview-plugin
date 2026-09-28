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
});
