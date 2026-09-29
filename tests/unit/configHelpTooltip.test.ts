import { createApp, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import ConfigHelpTooltip from '../../src/config/components/ConfigHelpTooltip.vue';

describe('ConfigHelpTooltip', () => {
  it('shows the Featured-style question-mark tooltip on focus', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const app = createApp(ConfigHelpTooltip, { text: 'Helpful context' });
    app.mount(host);

    const trigger = host.querySelector('button') as HTMLButtonElement;
    expect(trigger.textContent?.trim()).toBe('?');
    trigger.dispatchEvent(new FocusEvent('focus'));
    await nextTick();

    const tooltip = document.body.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tooltip.textContent).toContain('Helpful context');
    expect(tooltip.style.display).not.toBe('none');

    trigger.dispatchEvent(new FocusEvent('blur'));
    await nextTick();
    expect(tooltip.style.display).toBe('none');
    app.unmount();
  });
});
