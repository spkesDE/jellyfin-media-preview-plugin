<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../i18n';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigGrid from '../components/ConfigGrid.vue';
import ConfigListHeader from '../components/ConfigListHeader.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSection from '../components/ConfigSection.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';
import ConfigSwitch from '../components/ConfigSwitch.vue';

const store = useConfigStore();
const hoverModeOptions = computed<SelectOption[]>(() => [
  { value: 'scrub', label: t('trickplay.modeScrub') },
  { value: 'auto', label: t('trickplay.modeAuto') }
]);
const motionOptions = computed<SelectOption[]>(() => [
  { value: 'step', label: t('trickplay.motionStep') },
  { value: 'sweep', label: t('trickplay.motionSweep') },
  { value: 'ping-pong', label: t('trickplay.motionPingPong') }
]);
const presetOptions = computed<SelectOption[]>(() => [
  { value: 'snappy', label: t('trickplay.presetSnappy') },
  { value: 'balanced', label: t('trickplay.presetBalanced') },
  { value: 'cinematic', label: t('trickplay.presetCinematic') },
  { value: 'custom', label: t('trickplay.presetCustom') }
]);

const isAuto = computed(() => store.config.HoverMode === 'auto');
const isStep = computed(() => store.config.AutoScrubMode === 'step');

const motionText = computed(() => {
  if (store.config.AutoScrubMode === 'sweep') return t('trickplay.motionSweepHelp');
  if (store.config.AutoScrubMode === 'ping-pong') return t('trickplay.motionPingPongHelp');
  return t('trickplay.motionStepHelp');
});

const summary = computed(() =>
  [
    isAuto.value ? t('trickplay.modeAuto') : t('trickplay.modeScrub'),
    isAuto.value ? motionOptions.value.find((option) => option.value === store.config.AutoScrubMode)?.label : null,
    store.config.TrickplayPreloadEnabled ? t('trickplay.summaryPreload') : null,
    t('trickplay.summaryWidth', { width: Number(store.config.TrickplayWidth) || 0 })
  ]
    .filter(Boolean)
    .join(' · ')
);
</script>

<template>
  <section
    id="mediaPreviewPanel-trickplay"
    class="jmp-section jmp-section-plain"
    data-tab-section="trickplay"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-trickplay"
  >
    <ConfigListHeader :title="t('trickplay.title')" :help-text="t('trickplay.help')" :summary="summary" />

    <div class="jmp-subgrid">
      <ConfigCard :title="t('trickplay.motionTitle')">
        <ConfigSection :title="t('trickplay.modeSection')">
          <ConfigSelect
            v-model="store.config.HoverMode"
            :label="t('trickplay.hoverMode')"
            :options="hoverModeOptions"
          />
          <p v-if="!isAuto" class="jmp-note">{{ t('trickplay.scrubHelp') }}</p>
        </ConfigSection>

        <template v-if="isAuto">
          <ConfigSection :title="t('trickplay.autoSection')">
            <ConfigSelect
              v-model="store.config.AutoScrubMode"
              :label="t('trickplay.motionStyle')"
              :options="motionOptions"
            />
            <div class="jmp-modeCard" aria-hidden="true">
              <span class="jmp-modeGlyph" aria-hidden="true">{{ store.motionProfile.value.glyph }}</span>
              <div class="jmp-modeCardBody">
                <p class="jmp-modeText">{{ motionText }}</p>
              </div>
            </div>
            <ConfigGrid>
              <ConfigNumber
                v-model="store.config.AutoScrubStartPercent"
                :label="t('trickplay.startPercent')"
                :min="0"
                :max="100"
                :step="1"
              />
              <ConfigNumber
                v-if="isStep"
                v-model="store.config.AutoScrubIntervalMs"
                :label="t('trickplay.frameDelay')"
                :min="16"
                :step="1"
              />
              <ConfigSelect
                v-else
                v-model="store.config.AutoScrubPreset"
                :label="t('trickplay.preset')"
                :options="presetOptions"
              />
            </ConfigGrid>
          </ConfigSection>

          <ConfigSection v-if="!isStep" :title="t('trickplay.pacingSection')" :help-text="t('trickplay.pacingHelp')">
            <div class="jmp-pillRow" aria-hidden="true">
              <span class="jmp-pill">
                <span class="jmp-pillKey">{{ t('trickplay.pillMin') }}</span>
                <span class="jmp-pillValue">{{ store.presetValues.value.min }} ms</span>
              </span>
              <span class="jmp-pill">
                <span class="jmp-pillKey">{{ t('trickplay.pillMax') }}</span>
                <span class="jmp-pillValue">{{ store.presetValues.value.max }} ms</span>
              </span>
              <span class="jmp-pill">
                <span class="jmp-pillKey">{{ t('trickplay.pillDuration') }}</span>
                <span class="jmp-pillValue">{{ store.presetValues.value.duration }} ms</span>
              </span>
            </div>
            <ConfigGrid v-if="store.config.AutoScrubPreset === 'custom'" :columns="3">
              <ConfigNumber
                v-model="store.config.AutoScrubMinDelayMs"
                :label="t('trickplay.minDelay')"
                :help-text="t('trickplay.minDelayHelp')"
                :min="16"
                :step="1"
                @update:model-value="store.markAutoPresetCustom"
              />
              <ConfigNumber
                v-model="store.config.AutoScrubMaxDelayMs"
                :label="t('trickplay.maxDelay')"
                :help-text="t('trickplay.maxDelayHelp')"
                :min="50"
                :step="1"
                @update:model-value="store.markAutoPresetCustom"
              />
              <ConfigNumber
                v-model="store.config.AutoScrubDurationMs"
                :label="t('trickplay.duration')"
                :help-text="t('trickplay.durationHelp')"
                :min="500"
                :step="1"
                @update:model-value="store.markAutoPresetCustom"
              />
            </ConfigGrid>
          </ConfigSection>
        </template>
      </ConfigCard>

      <ConfigCard :title="t('trickplay.loadingTitle')">
        <ConfigSection :title="t('trickplay.preloadSection')">
          <ConfigSwitch
            v-model="store.config.TrickplayPreloadEnabled"
            :label="t('trickplay.preload')"
            :help-text="t('trickplay.preloadHelp')"
          />
          <ConfigNumber
            v-if="store.config.TrickplayPreloadEnabled"
            v-model="store.config.TrickplayPreloadLimit"
            :label="t('trickplay.preloadLimit')"
            :min="1"
            :step="1"
          />
          <ConfigNumber
            v-if="store.config.TrickplayPreloadEnabled"
            v-model="store.config.TrickplayPreloadMaxCards"
            :label="t('trickplay.preloadMaxCards')"
            :help-text="t('trickplay.preloadMaxCardsHelp')"
            :min="0"
            :max="500"
            :step="1"
          />
          <ConfigSwitch
            v-model="store.config.TrickplayLoadingIndicatorEnabled"
            :label="t('trickplay.loadingIndicator')"
          />
        </ConfigSection>
        <ConfigSection :title="t('trickplay.qualitySection')">
          <ConfigNumber
            v-model="store.config.TrickplayWidth"
            :label="t('trickplay.width')"
            :help-text="t('trickplay.widthHelp')"
            :min="1"
            :step="1"
          />
        </ConfigSection>
      </ConfigCard>
    </div>
  </section>
</template>
