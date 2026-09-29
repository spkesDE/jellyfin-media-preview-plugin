import { describe, expect, it } from 'vitest';
import { createConfigStore } from '../../src/config/libs/store';

describe('configuration tabs', () => {
  it('keeps source setting tabs selectable when their sources are disabled', () => {
    const store = createConfigStore();
    store.config.PreviewSource = 'direct-play';

    for (const chain of [
      store.config.PreferTrailerFallbacks,
      store.config.PreferTrickplayFallbacks,
      store.config.PreferDirectPlayFallbacks
    ]) {
      for (const fallback of chain) {
        if (
          fallback.Source === 'trickplay' ||
          fallback.Source === 'local-trailer' ||
          fallback.Source === 'remote-trailer'
        ) {
          fallback.Enabled = false;
        }
      }
    }

    expect(store.canUseTrickplay.value).toBe(false);
    expect(store.canUseTrailer.value).toBe(false);

    store.selectTab('trickplay');
    expect(store.activeTab.value).toBe('trickplay');

    store.selectTab('trailer');
    expect(store.activeTab.value).toBe('trailer');
  });
});
