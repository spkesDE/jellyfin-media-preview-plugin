<script setup lang="ts">
import { computed } from 'vue';
import type { ContentTypePreviewSource, PreviewChainSource } from '../../types/config';
import { t } from '../i18n';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigGrid from '../components/ConfigGrid.vue';
import ConfigListHeader from '../components/ConfigListHeader.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSection from '../components/ConfigSection.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';
import ConfigSwitch from '../components/ConfigSwitch.vue';
import type { ConfigPreviewFallbackSource } from '../libs/types';

const store = useConfigStore();
const positionOptions = computed<SelectOption[]>(() => [
  { value: 'top-left', label: t('position.topLeft') },
  { value: 'top-right', label: t('position.topRight') },
  { value: 'bottom-left', label: t('position.bottomLeft') },
  { value: 'bottom-right', label: t('position.bottomRight') }
]);
const defaultSourceOptions = computed<SelectOption[]>(() => [
  { value: 'trickplay', label: t('source.onlyTrickplay') },
  { value: 'direct-play', label: t('source.onlyDirectPlay') },
  { value: 'trailer', label: t('source.onlyTrailer') },
  { value: 'prefer-trickplay', label: t('source.preferTrickplay') },
  { value: 'prefer-trailer', label: t('source.preferTrailer') },
  { value: 'prefer-direct-play', label: t('source.preferDirectPlay') }
]);
const inheritedSourceOptions = computed<SelectOption[]>(() => [
  { value: 'inherit', label: t('source.useDefault') },
  ...defaultSourceOptions.value
]);
const librarySourceOptions = computed<SelectOption[]>(() => [
  { value: 'inherit', label: t('source.useTypeOrDefault') },
  ...defaultSourceOptions.value
]);

function chainLabel(source: PreviewChainSource): string {
  return {
    trickplay: t('chain.trickplay'),
    'local-trailer': t('chain.localTrailer'),
    'remote-trailer': t('chain.remoteTrailer'),
    'direct-play': t('chain.directPlay')
  }[source];
}

function describeChain(primary: PreviewChainSource | null, fallbacks: ConfigPreviewFallbackSource[]): string {
  const chain = [
    ...(primary ? [primary] : []),
    ...fallbacks.filter((entry) => entry.Enabled).map((entry) => entry.Source)
  ];
  return chain.map(chainLabel).join(' → ');
}

function describeSource(value: unknown): string {
  const source = String(value || 'inherit') as ContentTypePreviewSource;
  switch (source) {
    case 'prefer-trailer':
      return `${t('source.preferTrailer')}: ${describeChain(null, store.config.PreferTrailerFallbacks)}.`;
    case 'prefer-trickplay':
      return `${t('source.preferTrickplay')}: ${describeChain('trickplay', store.config.PreferTrickplayFallbacks)}.`;
    case 'prefer-direct-play':
      return `${t('source.preferDirectPlay')}: ${describeChain('direct-play', store.config.PreferDirectPlayFallbacks)}.`;
    case 'trickplay':
      return t('source.describeTrickplay');
    case 'direct-play':
      return t('source.describeDirectPlay');
    case 'trailer':
      return t('source.describeTrailer');
    default:
      return t('source.describeInherit');
  }
}

function sourceName(value: unknown): string {
  return [...inheritedSourceOptions.value].find((option) => option.value === value)?.label ?? String(value || '');
}

function formatCollectionType(value?: string): string {
  const key = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    movies: t('library.movies'),
    tvshows: t('library.tvshows'),
    musicvideos: t('library.musicvideos'),
    homevideos: t('library.homevideos'),
    mixed: t('library.mixed'),
    boxsets: t('library.boxsets')
  };
  return labels[key] || value || t('library.generic');
}

function updateLibraryOverride(libraryId: string, value: string): void {
  store.setLibraryOverride(libraryId, value as ContentTypePreviewSource);
}

const ruleCount = computed(
  () =>
    store.libraries.value.filter((library) => store.getLibraryOverride(library.Id) !== 'inherit').length +
    [
      store.config.InProgressPreviewSource,
      store.config.MoviePreviewSource,
      store.config.SeriesPreviewSource,
      store.config.EpisodePreviewSource,
      store.config.VideoPreviewSource
    ].filter((value) => value !== 'inherit').length
);

const summary = computed(() =>
  [
    store.config.Enabled ? t('common.enabled') : t('common.disabled'),
    t('general.summaryDelay', { ms: Number(store.config.HoverDelayMs) || 0 }),
    sourceName(store.config.PreviewSource),
    ruleCount.value === 1 ? t('general.summaryRuleOne') : t('general.summaryRules', { count: ruleCount.value })
  ].join(' · ')
);
</script>

<template>
  <section
    id="mediaPreviewPanel-general"
    class="jmp-section jmp-section-plain"
    data-tab-section="general"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-general"
  >
    <ConfigListHeader :title="t('general.title')" :help-text="t('general.help')" :summary="summary">
      <template #actions>
        <label class="jmp-headerSwitch">
          <span>{{ t('common.enabled') }}</span>
          <ConfigSwitch v-model="store.config.Enabled" :label="t('general.enable')" hide-label />
        </label>
      </template>
    </ConfigListHeader>

    <div class="jmp-generalGrid">
      <ConfigCard :title="t('general.hoverTitle')">
        <ConfigSection :title="t('general.timingSection')">
          <ConfigGrid>
            <ConfigNumber v-model="store.config.HoverDelayMs" :label="t('general.hoverDelay')" :min="0" :step="50" />
            <ConfigNumber
              v-model="store.config.HoverCooldownMs"
              :label="t('general.hoverCooldown')"
              :help-text="t('general.hoverCooldownHelp')"
              :min="0"
              :step="50"
            />
          </ConfigGrid>
        </ConfigSection>

        <ConfigSection :title="t('general.intentSection')" :help-text="t('general.intentHelp')">
          <ConfigSwitch v-model="store.config.HoverIntentEnabled" :label="t('general.intentEnable')" />
          <ConfigNumber
            v-if="store.config.HoverIntentEnabled"
            v-model="store.config.HoverIntentThresholdPx"
            :label="t('general.intentThreshold')"
            :min="0"
            :step="1"
          />
        </ConfigSection>

        <ConfigSection :title="t('general.feedbackSection')">
          <ConfigSwitch
            v-model="store.config.HoverCountdownEnabled"
            :label="t('general.countdown')"
            :help-text="t('general.countdownHelp')"
          />
          <ConfigSelect
            v-if="store.config.HoverCountdownEnabled"
            v-model="store.config.HoverCountdownPosition"
            :label="t('general.countdownPosition')"
            :options="positionOptions"
          />
          <ConfigSwitch v-model="store.config.ShowNoPreviewMessage" :label="t('general.noPreviewMessage')" />
          <ConfigSwitch v-model="store.config.RestoreOnLeave" :label="t('general.restoreOnLeave')" />
        </ConfigSection>
      </ConfigCard>

      <div class="jmp-generalSelectionGrid">
        <ConfigCard class="jmp-selectionIntro" :title="t('rules.title')" :help="t('rules.help')" />

        <ConfigCard
          :title="t('rules.inProgressTitle')"
          :badge="t('rules.priority', { n: 1 })"
          :help="t('rules.inProgressHelp')"
        >
          <ConfigSelect
            v-model="store.config.InProgressPreviewSource"
            :label="t('rules.inProgressLabel')"
            :help-text="describeSource(store.config.InProgressPreviewSource)"
            :options="inheritedSourceOptions"
          />
        </ConfigCard>

        <ConfigCard
          :title="t('rules.libraryTitle')"
          :badge="t('rules.priority', { n: 2 })"
          :help="t('rules.libraryHelp')"
        >
          <ConfigGrid v-if="store.libraries.value.length">
            <ConfigSelect
              v-for="library in store.libraries.value"
              :key="library.Id"
              :model-value="store.getLibraryOverride(library.Id)"
              :label="`${library.Name} (${formatCollectionType(library.CollectionType)})`"
              :help-text="describeSource(store.getLibraryOverride(library.Id))"
              :options="librarySourceOptions"
              @update:model-value="updateLibraryOverride(library.Id, $event)"
            />
          </ConfigGrid>
          <p v-else class="jmp-note">{{ t('rules.noLibraries') }}</p>
        </ConfigCard>

        <ConfigCard :title="t('rules.typeTitle')" :badge="t('rules.priority', { n: 3 })" :help="t('rules.typeHelp')">
          <ConfigGrid>
            <ConfigSelect
              v-model="store.config.MoviePreviewSource"
              :label="t('rules.movies')"
              :help-text="describeSource(store.config.MoviePreviewSource)"
              :options="inheritedSourceOptions"
            />
            <ConfigSelect
              v-model="store.config.SeriesPreviewSource"
              :label="t('rules.series')"
              :help-text="describeSource(store.config.SeriesPreviewSource)"
              :options="inheritedSourceOptions"
            />
            <ConfigSelect
              v-model="store.config.EpisodePreviewSource"
              :label="t('rules.episodes')"
              :help-text="describeSource(store.config.EpisodePreviewSource)"
              :options="inheritedSourceOptions"
            />
            <ConfigSelect
              v-model="store.config.VideoPreviewSource"
              :label="t('rules.otherVideos')"
              :help-text="describeSource(store.config.VideoPreviewSource)"
              :options="inheritedSourceOptions"
            />
          </ConfigGrid>
        </ConfigCard>

        <ConfigCard
          class="jmp-selectionFallback"
          :title="t('rules.defaultTitle')"
          :badge="t('rules.priority', { n: 4 })"
          badge-tone="muted"
          :help="t('rules.defaultHelp')"
        >
          <ConfigSelect
            v-model="store.config.PreviewSource"
            :label="t('rules.defaultLabel')"
            :help-text="describeSource(store.config.PreviewSource)"
            :options="defaultSourceOptions"
          />
        </ConfigCard>
      </div>
    </div>
  </section>
</template>
