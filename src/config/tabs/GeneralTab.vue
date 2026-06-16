<script setup lang="ts">
import type { ContentTypePreviewSource } from '../../types/config';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';

const store = useConfigStore();
const positionOptions: SelectOption[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' }
];
const defaultSourceOptions: SelectOption[] = [
  { value: 'trickplay', label: 'Only Trickplay' },
  { value: 'trailer', label: 'Only Trailer' },
  { value: 'prefer-trickplay', label: 'Prefer Trickplay' },
  { value: 'prefer-trailer', label: 'Prefer Trailer' }
];
const inheritedSourceOptions: SelectOption[] = [
  { value: 'inherit', label: 'Use Default' },
  ...defaultSourceOptions
];
const librarySourceOptions: SelectOption[] = [
  { value: 'inherit', label: 'Use Type / Default Chain' },
  ...defaultSourceOptions
];

function formatCollectionType(value?: string): string {
  return ({
    movies: 'Movies',
    tvshows: 'TV Shows',
    musicvideos: 'Music Videos',
    homevideos: 'Home Videos',
    mixed: 'Mixed',
    boxsets: 'Collections'
  })[String(value || '').toLowerCase()] || value || 'Library';
}

function updateLibraryOverride(libraryId: string, value: string): void {
  store.setLibraryOverride(
    libraryId,
    value as ContentTypePreviewSource
  );
}
</script>

<template>
  <section id="mediaPreviewPanel-general" class="jmp-section jmp-section-plain" data-tab-section="general" role="tabpanel" aria-labelledby="mediaPreviewTab-general">
    <div class="jmp-generalGrid">
      <ConfigCard
        title="Basics"
        help="Primary on/off switches and what happens when a preview starts or ends."
      >
        <ConfigCheckbox v-model="store.config.Enabled" label="Enable Hover Preview" />
        <ConfigNumber v-model="store.config.HoverDelayMs" label="Hover Delay (ms)" :min="0" :step="50" />
        <p class="jmp-note">The optional countdown uses this same hover delay.</p>
        <ConfigCheckbox v-model="store.config.ShowNoPreviewMessage" label='Show "No Trailer/Trickplay Found" Message' />
        <ConfigCheckbox v-model="store.config.RestoreOnLeave" label="Restore Poster On Mouse Leave" />

        <div class="jmp-blockDivider">
          <p class="jmp-subsectionTitle">Hover Behavior</p>
          <p class="jmp-subsectionHelp">Tune how deliberate a hover must be before a preview starts.</p>
          <ConfigCheckbox v-model="store.config.HoverIntentEnabled" label="Enable Hover Intent" />
          <p class="jmp-note jmp-note-tight">Helps prevent accidental preview starts while you are just sweeping across posters.</p>
          <ConfigNumber
            v-if="store.config.HoverIntentEnabled"
            v-model="store.config.HoverIntentThresholdPx"
            label="Hover Intent Movement Threshold (px)"
            :min="0"
            :step="1"
          />
          <p class="jmp-note">When enabled, the hover delay restarts if the pointer keeps moving too far across the card. This helps avoid accidental preview starts while you are just passing over items.</p>
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
          title="Library Rule"
          badge="Priority 1"
          help='Everything in a configured library uses this rule first. "Use Type / Default Chain" falls through.'
        >
          <ConfigSelect
            v-for="library in store.libraries.value"
            :key="library.Id"
            :model-value="store.getLibraryOverride(library.Id)"
            :label="`${library.Name} (${formatCollectionType(library.CollectionType)})`"
            :options="librarySourceOptions"
            @update:model-value="updateLibraryOverride(library.Id, $event)"
          />
          <p v-if="!store.libraries.value.length" class="jmp-note">No accessible libraries were returned for the current user.</p>
        </ConfigCard>

        <ConfigCard title="Type Rule" badge="Priority 2" help="Used only when the current library has no explicit rule.">
          <div class="jmp-compactGrid">
            <ConfigSelect v-model="store.config.MoviePreviewSource" label="Movies" :options="inheritedSourceOptions" />
            <ConfigSelect v-model="store.config.SeriesPreviewSource" label="Series" :options="inheritedSourceOptions" />
            <ConfigSelect v-model="store.config.EpisodePreviewSource" label="Episodes" :options="inheritedSourceOptions" />
            <ConfigSelect v-model="store.config.VideoPreviewSource" label="Other Videos" :options="inheritedSourceOptions" />
          </div>
        </ConfigCard>

        <ConfigCard
          class="jmp-selectionFallback"
          title="Default Fallback"
          badge="Priority 3"
          badge-tone="muted"
          help="Used only when neither a library rule nor a type rule matches."
        >
          <ConfigSelect v-model="store.config.PreviewSource" label="Default Preview Mode" :options="defaultSourceOptions" />
          <p class="jmp-note">{{ store.previewSourceNote.value }}</p>
        </ConfigCard>
      </div>
    </div>
  </section>
</template>
