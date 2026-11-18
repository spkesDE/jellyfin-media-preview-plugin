<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../i18n';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigGrid from '../components/ConfigGrid.vue';
import ConfigListHeader from '../components/ConfigListHeader.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSection from '../components/ConfigSection.vue';
import ConfigSwitch from '../components/ConfigSwitch.vue';

const store = useConfigStore();

const summary = computed(() =>
  [
    store.config.KeyboardPreviewEnabled ? t('input.summaryKeyboardOn') : t('input.summaryKeyboardOff'),
    store.config.TouchPreviewEnabled
      ? t('input.summaryTouchOn', { ms: Number(store.config.TouchLongPressMs) || 0 })
      : t('input.summaryTouchOff')
  ].join(' · ')
);
</script>

<template>
  <section
    id="mediaPreviewPanel-keyboard"
    class="jmp-section jmp-section-plain"
    data-tab-section="keyboard"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-keyboard"
  >
    <ConfigListHeader :title="t('input.title')" :help-text="t('input.help')" :summary="summary" />

    <div class="jmp-subgrid">
      <ConfigCard :title="t('input.keyboardTitle')">
        <ConfigSection :title="t('input.activationSection')" :help-text="t('input.keyboardHelp')">
          <ConfigSwitch v-model="store.config.KeyboardPreviewEnabled" :label="t('input.keyboardEnable')" />
          <ConfigGrid v-if="store.config.KeyboardPreviewEnabled">
            <ConfigNumber
              v-model="store.config.KeyboardPreviewDelayMs"
              :label="t('input.keyboardDelay')"
              :min="0"
              :step="50"
            />
            <ConfigNumber
              v-model="store.config.KeyboardPreviewStartPercent"
              :label="t('input.keyboardStart')"
              :min="0"
              :max="100"
              :step="1"
            />
          </ConfigGrid>
        </ConfigSection>
        <ConfigSection v-if="store.config.KeyboardPreviewEnabled" :title="t('input.navigationSection')">
          <ConfigSwitch v-model="store.config.KeyboardArrowScrubEnabled" :label="t('input.arrowScrub')" />
          <ConfigNumber
            v-if="store.config.KeyboardArrowScrubEnabled"
            v-model="store.config.KeyboardArrowStepPercent"
            :label="t('input.arrowStep')"
            :min="1"
            :max="100"
            :step="1"
          />
          <ConfigSwitch v-model="store.config.KeyboardEscapeClosesPreview" :label="t('input.escape')" />
        </ConfigSection>
      </ConfigCard>

      <ConfigCard :title="t('input.touchTitle')" :badge="t('common.experimental')" badge-tone="wip">
        <ConfigSection :title="t('input.activationSection')" :help-text="t('input.touchHelp')">
          <ConfigSwitch v-model="store.config.TouchPreviewEnabled" :label="t('input.touchEnable')" />
          <ConfigNumber
            v-if="store.config.TouchPreviewEnabled"
            v-model="store.config.TouchLongPressMs"
            :label="t('input.longPress')"
            :min="250"
            :max="1500"
            :step="50"
          />
          <p v-if="store.config.TouchPreviewEnabled" class="jmp-note">{{ t('input.touchMultiSelect') }}</p>
        </ConfigSection>
      </ConfigCard>
    </div>
  </section>
</template>
