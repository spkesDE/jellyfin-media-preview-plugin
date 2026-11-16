<script setup lang="ts">
import type { ContentTypePreviewSource, PreviewChainSource } from '../../types/config';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';
import type { ConfigPreviewFallbackSource } from '../libs/types';

const store = useConfigStore();
const positionOptions: SelectOption[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' }
];
const defaultSourceOptions: SelectOption[] = [
  { value: 'trickplay', label: 'Only Trickplay' },
  { value: 'direct-play', label: 'Only Direct Play' },
  { value: 'trailer', label: 'Only Trailer' },
  { value: 'prefer-trickplay', label: 'Prefer Trickplay' },
  { value: 'prefer-trailer', label: 'Prefer Trailer' },
  { value: 'prefer-direct-play', label: 'Prefer Direct Play' }
];
const inheritedSourceOptions: SelectOption[] = [{ value: 'inherit', label: 'Use Default' }, ...defaultSourceOptions];
const librarySourceOptions: SelectOption[] = [
  { value: 'inherit', label: 'Use Type / Default Chain' },
  ...defaultSourceOptions
];

const sourceDescriptions: Partial<Record<ContentTypePreviewSource, string>> = {
  inherit: 'Continue to the next rule: library → media type → default.',
  trickplay: 'Only Trickplay: use Jellyfin scrub images. No video fallback.',
  'direct-play': 'Only Direct Play: play the media item itself, then use the optional bounded transcode fallback.',
  trailer: 'Only Trailer: local trailer → supported remote or YouTube trailer. No other source fallback.'
};

const sourceLabels: Record<PreviewChainSource, string> = {
  trickplay: 'Trickplay',
  'local-trailer': 'local trailer',
  'remote-trailer': 'supported remote or YouTube trailer',
  'direct-play': 'Direct Play → optional transcode'
};

function describePreferred(primary: PreviewChainSource, fallbacks: ConfigPreviewFallbackSource[]): string {
  const chain = [primary, ...fallbacks.filter((entry) => entry.Enabled).map((entry) => entry.Source)];
  return chain.map((source) => sourceLabels[source]).join(' → ');
}

function describeConfigured(chain: ConfigPreviewFallbackSource[]): string {
  return chain
    .filter((entry) => entry.Enabled)
    .map((entry) => sourceLabels[entry.Source])
    .join(' → ');
}

function describeSource(value: unknown): string {
  const source = String(value || 'inherit') as ContentTypePreviewSource;
  if (source === 'prefer-trailer') {
    return `Prefer Trailer: ${describeConfigured(store.config.PreferTrailerFallbacks)}.`;
  }
  if (source === 'prefer-trickplay') {
    return `Prefer Trickplay: ${describePreferred('trickplay', store.config.PreferTrickplayFallbacks)}.`;
  }
  if (source === 'prefer-direct-play') {
    return `Prefer Direct Play: ${describePreferred('direct-play', store.config.PreferDirectPlayFallbacks)}.`;
  }
  return sourceDescriptions[source] || sourceDescriptions.inherit || '';
}

function formatCollectionType(value?: string): string {
  return (
    {
      movies: 'Movies',
      tvshows: 'TV Shows',
      musicvideos: 'Music Videos',
      homevideos: 'Home Videos',
      mixed: 'Mixed',
      boxsets: 'Collections'
    }[String(value || '').toLowerCase()] ||
    value ||
    'Library'
  );
}

function updateLibraryOverride(libraryId: string, value: string): void {
  store.setLibraryOverride(libraryId, value as ContentTypePreviewSource);
}
</script>

<template>
  <section
    id="mediaPreviewPanel-general"
    class="jmp-section jmp-section-plain"
    data-tab-section="general"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-general"
  >
    <div class="jmp-generalGrid">
      <ConfigCard title="Basics" help="Primary on/off switches and what happens when a preview starts or ends.">
        <ConfigCheckbox v-model="store.config.Enabled" label="Enable Hover Preview" />
        <ConfigNumber v-model="store.config.HoverDelayMs" label="Hover Delay (ms)" :min="0" :step="50" />
        <p class="jmp-note">The optional countdown uses this same hover delay.</p>
        <ConfigCheckbox v-model="store.config.ShowNoPreviewMessage" label='Show "No Preview Available" Message' />
        <ConfigCheckbox v-model="store.config.RestoreOnLeave" label="Restore Poster On Mouse Leave" />

        <div class="jmp-blockDivider">
          <p class="jmp-subsectionTitle">Hover Behavior</p>
          <p class="jmp-subsectionHelp">Tune how deliberate a hover must be before a preview starts.</p>
          <ConfigCheckbox v-model="store.config.HoverIntentEnabled" label="Enable Hover Intent" />
          <p class="jmp-note jmp-note-tight">
            Helps prevent accidental preview starts while you are just sweeping across posters.
          </p>
          <ConfigNumber
            v-if="store.config.HoverIntentEnabled"
            v-model="store.config.HoverIntentThresholdPx"
            label="Hover Intent Movement Threshold (px)"
            :min="0"
            :step="1"
          />
          <p class="jmp-note">
            When enabled, the hover delay restarts if the pointer keeps moving too far across the card. This helps avoid
            accidental preview starts while you are just passing over items.
          </p>
          <ConfigNumber v-model="store.config.HoverCooldownMs" label="Hover Cooldown (ms)" :min="0" :step="50" />
          <p class="jmp-note">Adds a short re-entry cooldown per card before another preview may start again.</p>
          <ConfigCheckbox v-model="store.config.HoverCountdownEnabled" label="Show Hover Countdown" />
          <ConfigSelect
            v-if="store.config.HoverCountdownEnabled"
            v-model="store.config.HoverCountdownPosition"
            label="Countdown Position"
            :options="positionOptions"
          />
        </div>
      </ConfigCard>

      <div class="jmp-generalSelectionGrid">
        <ConfigCard
          class="jmp-selectionIntro"
          title="Preview Selection"
          help="Rules are evaluated from highest to lowest priority. Leave a rule on inherit to continue down the chain."
        />

        <ConfigCard
          title="In Progress Rule"
          badge="Priority 1"
          help="Overrides the rules below for an item with a saved playback position. Next Up episodes without their own progress are not included."
        >
          <ConfigSelect
            v-model="store.config.InProgressPreviewSource"
            label="In Progress Items"
            :help-text="describeSource(store.config.InProgressPreviewSource)"
            :options="inheritedSourceOptions"
          />
          <p class="jmp-note">Direct Play starts at the saved playback position when this rule is active.</p>
        </ConfigCard>

        <ConfigCard
          title="Library Rule"
          badge="Priority 2"
          help='After the in-progress rule, everything in a configured library uses this rule. "Use Type / Default Chain" falls through.'
        >
          <ConfigSelect
            v-for="library in store.libraries.value"
            :key="library.Id"
            :model-value="store.getLibraryOverride(library.Id)"
            :label="`${library.Name} (${formatCollectionType(library.CollectionType)})`"
            :help-text="describeSource(store.getLibraryOverride(library.Id))"
            :options="librarySourceOptions"
            @update:model-value="updateLibraryOverride(library.Id, $event)"
          />
          <p v-if="!store.libraries.value.length" class="jmp-note">
            No accessible libraries were returned for the current user.
          </p>
        </ConfigCard>

        <ConfigCard
          title="Type Rule"
          badge="Priority 3"
          help="Used only when the current library has no explicit rule."
        >
          <div class="jmp-compactGrid">
            <ConfigSelect
              v-model="store.config.MoviePreviewSource"
              label="Movies"
              :help-text="describeSource(store.config.MoviePreviewSource)"
              :options="inheritedSourceOptions"
            />
            <ConfigSelect
              v-model="store.config.SeriesPreviewSource"
              label="Series"
              :help-text="describeSource(store.config.SeriesPreviewSource)"
              :options="inheritedSourceOptions"
            />
            <ConfigSelect
              v-model="store.config.EpisodePreviewSource"
              label="Episodes"
              :help-text="describeSource(store.config.EpisodePreviewSource)"
              :options="inheritedSourceOptions"
            />
            <ConfigSelect
              v-model="store.config.VideoPreviewSource"
              label="Other Videos"
              :help-text="describeSource(store.config.VideoPreviewSource)"
              :options="inheritedSourceOptions"
            />
          </div>
        </ConfigCard>

        <ConfigCard
          class="jmp-selectionFallback"
          title="Default Fallback"
          badge="Priority 4"
          badge-tone="muted"
          help="Used only when neither a library rule nor a type rule matches."
        >
          <ConfigSelect
            v-model="store.config.PreviewSource"
            label="Default Preview Mode"
            :help-text="describeSource(store.config.PreviewSource)"
            :options="defaultSourceOptions"
          />
        </ConfigCard>
      </div>
    </div>
  </section>
</template>
