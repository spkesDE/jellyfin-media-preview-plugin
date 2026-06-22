<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '../libs/store';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';

const store = useConfigStore();
const hoverModeOptions: SelectOption[] = [
  { value: 'scrub', label: 'Scrub with mouse position' },
  { value: 'auto', label: 'Auto scrub on hover' }
];
const motionOptions: SelectOption[] = [
  { value: 'step', label: 'Frame by Frame' },
  { value: 'sweep', label: 'Continuous' },
  { value: 'ping-pong', label: 'Continuous Ping-Pong' }
];
const presetOptions: SelectOption[] = [
  { value: 'snappy', label: 'Snappy' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'custom', label: 'Custom' }
];

const isStep = computed(() => store.config.AutoScrubMode === 'step');
const isContinuous = computed(() => !isStep.value);
</script>

<template>
  <section id="mediaPreviewPanel-trickplay" class="jmp-section" data-tab-section="trickplay" role="tabpanel" aria-labelledby="mediaPreviewTab-trickplay">
    <h3>Trickplay Motion</h3>
    <p class="jmp-help">Control how Trickplay previews move when you hover a card.</p>

    <ConfigSelect v-model="store.config.HoverMode" label="Hover Mode" :options="hoverModeOptions" />
    <ConfigCheckbox v-model="store.config.TrickplayPreloadEnabled" label="Preload Trickplay before hover" />
    <p class="jmp-note">
      Warms Trickplay metadata and the likely first scrub tile for cards near the viewport, with a small request queue.
    </p>
    <ConfigNumber
      v-if="store.config.TrickplayPreloadEnabled"
      v-model="store.config.TrickplayPreloadLimit"
      label="Max Parallel Preloads"
      :min="1"
      :step="1"
    />
    <ConfigCheckbox v-model="store.config.TrickplayLoadingIndicatorEnabled" label="Show Trickplay loading indicator" />

    <p v-if="store.config.HoverMode === 'scrub'" class="jmp-note">
      Scrub pacing is adaptive automatically. Dense Trickplay sets react quickly, while sparse sets hold each frame a bit longer so the preview feels calmer instead of jumpy.
    </p>

    <template v-if="store.config.HoverMode === 'auto'">
      <ConfigSelect v-model="store.config.AutoScrubMode" label="Auto Motion Style" :options="motionOptions" />
      <div class="jmp-modeCard" aria-hidden="true">
        <span class="jmp-modeGlyph" aria-hidden="true">{{ store.motionProfile.value.glyph }}</span>
        <div class="jmp-modeCardBody">
          <p class="jmp-modeTitle">{{ store.motionProfile.value.title }}</p>
          <p class="jmp-modeText">{{ store.motionProfile.value.text }}</p>
        </div>
      </div>

      <ConfigNumber v-model="store.config.AutoScrubStartPercent" label="Auto Scrub Start (%)" :min="0" :max="100" :step="1" />

      <ConfigNumber
        v-if="isStep"
        v-model="store.config.AutoScrubIntervalMs"
        label="Frame Delay (ms)"
        :min="16"
        :step="1"
      />

      <template v-if="isContinuous">
        <ConfigSelect v-model="store.config.AutoScrubPreset" label="Auto Scrub Preset" :options="presetOptions" />
        <div class="jmp-pillRow" aria-hidden="true">
          <span class="jmp-pill"><span class="jmp-pillKey">Min</span><span class="jmp-pillValue">{{ store.presetValues.value.min }} ms</span></span>
          <span class="jmp-pill"><span class="jmp-pillKey">Max</span><span class="jmp-pillValue">{{ store.presetValues.value.max }} ms</span></span>
          <span class="jmp-pill"><span class="jmp-pillKey">Duration</span><span class="jmp-pillValue">{{ store.presetValues.value.duration }} ms</span></span>
        </div>

        <template v-if="store.config.AutoScrubPreset === 'custom'">
          <ConfigNumber
            v-model="store.config.AutoScrubMinDelayMs"
            label="Auto Scrub Min Delay (ms)"
            :min="16"
            :step="1"
            @update:model-value="store.markAutoPresetCustom"
          />
          <p class="jmp-note">Lower bound for the adaptive per-frame hold. Lower values feel more immediate.</p>
          <ConfigNumber
            v-model="store.config.AutoScrubMaxDelayMs"
            label="Auto Scrub Max Delay (ms)"
            :min="50"
            :step="1"
            @update:model-value="store.markAutoPresetCustom"
          />
          <p class="jmp-note">Upper bound for sparse Trickplay sets so they never linger too long on one frame.</p>
          <ConfigNumber
            v-model="store.config.AutoScrubDurationMs"
            label="Planned Sweep Duration (ms)"
            :min="500"
            :step="1"
            @update:model-value="store.markAutoPresetCustom"
          />
          <p class="jmp-note">Target overall sweep duration. The plugin derives a frame delay from it and then clamps that delay between your min and max values.</p>
        </template>
      </template>
    </template>
  </section>
</template>
