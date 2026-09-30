import { createApp, nextTick } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import AdvancedTab from '../../src/config/tabs/AdvancedTab.vue';
import { configStoreKey, createConfigStore } from '../../src/config/libs/store';

describe('frontend injection settings', () => {
  let unmount: (() => void) | null = null;

  afterEach(() => {
    unmount?.();
    unmount = null;
    document.body.replaceChildren();
  });

  it('disables injection methods that the server reports as unavailable', async () => {
    const store = createConfigStore();
    const host = document.createElement('div');
    document.body.appendChild(host);

    const app = createApp(AdvancedTab);
    app.provide(configStoreKey, store);
    app.mount(host);
    unmount = () => app.unmount();

    const option = (value: string): HTMLOptionElement => {
      const match = host.querySelector<HTMLOptionElement>(`option[value="${value}"]`);
      if (!match) {
        throw new Error(`Missing injection option: ${value}`);
      }

      return match;
    };

    expect(option('automatic').disabled).toBe(false);
    expect(option('file-transformation').disabled).toBe(true);
    expect(option('javascript-injector').disabled).toBe(true);
    expect(option('direct').disabled).toBe(true);

    store.injectionMethodsAvailable.value = {
      automatic: true,
      'file-transformation': false,
      'javascript-injector': true,
      direct: true
    };
    await nextTick();

    expect(option('file-transformation').disabled).toBe(true);
    expect(option('javascript-injector').disabled).toBe(false);
    expect(option('direct').disabled).toBe(false);
    expect(option('file-transformation').textContent).toContain('(unavailable)');
  });
});
