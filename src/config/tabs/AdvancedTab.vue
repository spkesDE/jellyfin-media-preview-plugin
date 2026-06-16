<script setup lang="ts">
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';

const store = useConfigStore();
</script>

<template>
  <section id="mediaPreviewPanel-advanced" class="jmp-section jmp-section-plain" data-tab-section="advanced" role="tabpanel" aria-labelledby="mediaPreviewTab-advanced">
    <div class="jmp-subgrid">
      <ConfigCard
        v-if="store.canUseTrickplay.value"
        title="Performance"
        help="Normally you can leave this alone unless you need to steer which Trickplay width Jellyfin should prefer."
      >
        <ConfigNumber v-model="store.config.TrickplayWidth" label="Preferred Trickplay Width" :min="1" :step="1" />
      </ConfigCard>

      <ConfigCard title="Diagnostics" help="Use this when you need to inspect matching, preview resolution, or rendering behavior in the browser console.">
        <ConfigCheckbox v-model="store.config.Debug" label="Enable Debug Logging" />
      </ConfigCard>
    </div>
  </section>
</template>
