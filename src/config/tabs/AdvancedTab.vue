<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../i18n';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigListHeader from '../components/ConfigListHeader.vue';
import ConfigSection from '../components/ConfigSection.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';
import ConfigSwitch from '../components/ConfigSwitch.vue';
import DiagnosticsPanel from '../components/DiagnosticsPanel.vue';
import PreferenceChainEditor from '../components/PreferenceChainEditor.vue';

const store = useConfigStore();

function optionLabel(label: string, available: boolean): string {
  return available ? label : t('advanced.unavailable', { label });
}

const frontendInjectionOptions = computed<SelectOption[]>(() => [
  { value: 'automatic', label: t('advanced.injectionAutomatic') },
  {
    value: 'file-transformation',
    label: optionLabel(
      t('advanced.injectionFileTransformation'),
      store.injectionMethodsAvailable.value['file-transformation']
    ),
    disabled: !store.injectionMethodsAvailable.value['file-transformation']
  },
  {
    value: 'javascript-injector',
    label: optionLabel(
      t('advanced.injectionJavaScriptInjector'),
      store.injectionMethodsAvailable.value['javascript-injector']
    ),
    disabled: !store.injectionMethodsAvailable.value['javascript-injector']
  },
  {
    value: 'direct',
    label: optionLabel(t('advanced.injectionDirect'), store.injectionMethodsAvailable.value.direct),
    disabled: !store.injectionMethodsAvailable.value.direct
  }
]);

const summary = computed(() =>
  [
    frontendInjectionOptions.value.find((option) => option.value === store.config.FrontendInjectionMethod)?.label,
    store.config.Debug ? t('advanced.summaryDebug') : null
  ]
    .filter(Boolean)
    .join(' · ')
);
</script>

<template>
  <section
    id="mediaPreviewPanel-advanced"
    class="jmp-section jmp-section-plain"
    data-tab-section="advanced"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-advanced"
  >
    <ConfigListHeader :title="t('advanced.title')" :help-text="t('advanced.help')" :summary="summary" />

    <div class="jmp-subgrid">
      <ConfigCard
        class="jmp-advancedPreferenceCard"
        :title="t('advanced.chainsTitle')"
        :help="t('advanced.chainsHelp')"
      >
        <div class="jmp-preferenceGrid">
          <PreferenceChainEditor
            v-model="store.config.PreferTrailerFallbacks"
            :title="t('source.preferTrailer')"
            primary="local-trailer"
            :fixed-primary="false"
          />
          <PreferenceChainEditor
            v-model="store.config.PreferTrickplayFallbacks"
            :title="t('source.preferTrickplay')"
            primary="trickplay"
          />
          <PreferenceChainEditor
            v-model="store.config.PreferDirectPlayFallbacks"
            :title="t('source.preferDirectPlay')"
            primary="direct-play"
          />
        </div>
      </ConfigCard>

      <ConfigCard class="jmp-splitCard jmp-advancedPreferenceCard" :title="t('advanced.loaderTitle')">
        <div class="jmp-splitColumn">
          <ConfigSection :title="t('advanced.injectionSection')" :help-text="t('advanced.injectionHelp')">
            <ConfigSelect
              v-model="store.config.FrontendInjectionMethod"
              :label="t('advanced.injectionLabel')"
              :options="frontendInjectionOptions"
            />
          </ConfigSection>
          <ConfigSection :title="t('advanced.loggingSection')">
            <ConfigSwitch
              v-model="store.config.Debug"
              :label="t('advanced.debug')"
              :help-text="t('advanced.debugHelp')"
            />
          </ConfigSection>
        </div>
        <div class="jmp-splitColumn">
          <ConfigSection :title="t('advanced.diagnosticsSection')" :help-text="t('advanced.diagnosticsHelp')">
            <DiagnosticsPanel />
          </ConfigSection>
        </div>
      </ConfigCard>
    </div>
  </section>
</template>
