import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../../src/config/libs/defaults';

describe('preferred source chain defaults', () => {
  it('enables every fallback in the requested default order', () => {
    const config = createDefaultConfig();

    expect(config.InProgressPreviewSource).toBe('inherit');

    expect(config.PreferTrailerFallbacks).toEqual([
      { Source: 'local-trailer', Enabled: true },
      { Source: 'remote-trailer', Enabled: true },
      { Source: 'direct-play', Enabled: true },
      { Source: 'trickplay', Enabled: true }
    ]);
    expect(config.PreferTrickplayFallbacks).toEqual([
      { Source: 'local-trailer', Enabled: true },
      { Source: 'remote-trailer', Enabled: true },
      { Source: 'direct-play', Enabled: true }
    ]);
    expect(config.PreferDirectPlayFallbacks).toEqual([
      { Source: 'trickplay', Enabled: true },
      { Source: 'local-trailer', Enabled: true },
      { Source: 'remote-trailer', Enabled: true }
    ]);
  });
});
