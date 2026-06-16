<script setup lang="ts">
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';

const store = useConfigStore();
</script>

<template>
  <section id="mediaPreviewPanel-keyboard" class="jmp-section jmp-section-plain" data-tab-section="keyboard" role="tabpanel" aria-labelledby="mediaPreviewTab-keyboard">
    <div class="jmp-subgrid">
      <ConfigCard
        title="Activation"
        badge="Work in progress"
        badge-tone="wip"
        help="Experimental focus-based navigation. Behavior may still vary between Jellyfin views and clients."
      >
        <ConfigCheckbox v-model="store.config.KeyboardPreviewEnabled" label="Enable Keyboard Preview" />
      </ConfigCard>
    </div>

    <div v-if="store.config.KeyboardPreviewEnabled" class="jmp-subgrid">
      <ConfigCard title="Activation Timing" help="Decide when a focused card should start its preview.">
        <ConfigNumber v-model="store.config.KeyboardPreviewDelayMs" label="Keyboard Preview Delay (ms)" :min="0" :step="50" />
        <ConfigNumber v-model="store.config.KeyboardPreviewStartPercent" label="Keyboard Start Position (%)" :min="0" :max="100" :step="1" />
      </ConfigCard>

      <ConfigCard title="Navigation" help="Control how previews react once the card is focused.">
        <ConfigCheckbox v-model="store.config.KeyboardArrowScrubEnabled" label="Enable Arrow-Key Scrubbing" />
        <ConfigNumber
          v-if="store.config.KeyboardArrowScrubEnabled"
          v-model="store.config.KeyboardArrowStepPercent"
          label="Arrow-Key Step (%)"
          :min="1"
          :max="100"
          :step="1"
        />
        <ConfigCheckbox v-model="store.config.KeyboardEscapeClosesPreview" label="Escape Closes Preview" />
      </ConfigCard>
    </div>
  </section>
</template>
