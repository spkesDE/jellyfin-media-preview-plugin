<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';
import PreferenceChainEditor from '../components/PreferenceChainEditor.vue';

const store = useConfigStore();
const frontendInjectionOptions = computed<SelectOption[]>(() => [
  { value: 'automatic', label: 'Automatic (File Transformation → JavaScript Injector → Direct)' },
  {
    value: 'file-transformation',
    label: optionLabel('File Transformation only', store.injectionMethodsAvailable.value['file-transformation']),
    disabled: !store.injectionMethodsAvailable.value['file-transformation']
  },
  {
    value: 'javascript-injector',
    label: optionLabel('JavaScript Injector only', store.injectionMethodsAvailable.value['javascript-injector']),
    disabled: !store.injectionMethodsAvailable.value['javascript-injector']
  },
  {
    value: 'direct',
    label: optionLabel('Direct injection', store.injectionMethodsAvailable.value.direct),
    disabled: !store.injectionMethodsAvailable.value.direct
  }
]);

function optionLabel(label: string, available: boolean): string {
  return available ? label : `${label} (unavailable)`;
}
</script>

<template>
  <section
    id="mediaPreviewPanel-advanced"
    class="jmp-section jmp-section-plain"
    data-tab-section="advanced"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-advanced"
  >
    <div class="jmp-subgrid">
      <ConfigCard
        class="jmp-advancedPreferenceCard"
        title="Preferred Source Chains"
        help="Drag sources into the preferred order and disable any fallback you do not want. Prefer Trailer is fully sortable; Trickplay and Direct Play stay fixed at the top of their own chains."
      >
        <div class="jmp-preferenceGrid">
          <PreferenceChainEditor
            v-model="store.config.PreferTrailerFallbacks"
            title="Prefer Trailer"
            primary="local-trailer"
            :fixed-primary="false"
          />
          <PreferenceChainEditor
            v-model="store.config.PreferTrickplayFallbacks"
            title="Prefer Trickplay"
            primary="trickplay"
          />
          <PreferenceChainEditor
            v-model="store.config.PreferDirectPlayFallbacks"
            title="Prefer Direct Play"
            primary="direct-play"
          />
        </div>
      </ConfigCard>

      <ConfigCard
        title="Frontend Injection"
        help="Automatic selects the first available method in the order shown and falls back to direct injection when Jellyfin Web is writable. Restart Jellyfin after changing this setting."
      >
        <ConfigSelect
          v-model="store.config.FrontendInjectionMethod"
          label="Frontend Injection Method"
          :options="frontendInjectionOptions"
        />
      </ConfigCard>

      <ConfigCard
        title="Performance"
        help="Normally you can leave this alone unless you need to steer which Trickplay width Jellyfin should prefer."
      >
        <ConfigNumber v-model="store.config.TrickplayWidth" label="Preferred Trickplay Width" :min="1" :step="1" />
      </ConfigCard>

      <ConfigCard
        title="Diagnostics"
        help="Use this when you need to inspect matching, preview resolution, or rendering behavior in the browser console."
      >
        <ConfigCheckbox v-model="store.config.Debug" label="Enable Debug Logging" />
      </ConfigCard>
    </div>
  </section>
</template>
