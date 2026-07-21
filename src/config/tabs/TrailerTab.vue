<script setup lang="ts">
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';

const store = useConfigStore();
const cropOptions: SelectOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'strong', label: 'Strong' }
];
const positionOptions: SelectOption[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' }
];
</script>

<template>
  <section id="mediaPreviewPanel-trailer" class="jmp-section jmp-section-plain" data-tab-section="trailer" role="tabpanel" aria-labelledby="mediaPreviewTab-trailer">
    <div class="jmp-subgrid">
      <ConfigCard title="Playback" help="These options apply whenever trailer playback is used directly or as a fallback source.">
        <ConfigCheckbox v-model="store.config.TrailerAudioEnabled" label="Enable Trailer Audio When Allowed" />
        <p class="jmp-note">Browsers often block unmuted autoplay until the page has received user interaction once. Until then, trailers may still start muted.</p>
        <ConfigNumber
          v-if="store.config.TrailerAudioEnabled"
          v-model="store.config.TrailerVolumePercent"
          label="Trailer Volume (%)"
          :min="0"
          :max="100"
          :step="1"
        />
      </ConfigCard>

      <ConfigCard title="Embed Framing" help="Adjust how remote trailer embeds sit inside the card.">
        <ConfigSelect v-model="store.config.YouTubeCropStrength" label="YouTube Crop Strength" :options="cropOptions" />
        <p class="jmp-note">Crop strength slightly enlarges YouTube embeds to push overlays and branding further out of frame.</p>
      </ConfigCard>

      <ConfigCard title="Unavailable Trailers" help="Control when failed YouTube embeds should be tested again.">
        <ConfigCheckbox
          v-model="store.config.UnavailableTrailerCacheEnabled"
          label="Remember Unavailable Trailers"
        />
        <ConfigNumber
          v-if="store.config.UnavailableTrailerCacheEnabled"
          v-model="store.config.UnavailableTrailerRetryDays"
          label="Retry Unavailable Trailers After (days)"
          :min="1"
          :max="365"
          :step="1"
        />
        <p v-if="store.config.UnavailableTrailerCacheEnabled" class="jmp-note">YouTube errors 100, 101, and 150 are skipped server-wide until this interval has elapsed. Changing the interval also updates existing entries on their next access.</p>
        <p v-else class="jmp-note">Failed embeds still fall back during the current browser session, but they are not remembered across reloads.</p>
      </ConfigCard>

      <ConfigCard title="Controls" help="Decide whether the in-card expand affordance should be shown and where it sits.">
        <ConfigCheckbox v-model="store.config.TrailerExpandButtonEnabled" label="Show Expand Button" />
        <ConfigSelect v-model="store.config.TrailerExpandButtonPosition" label="Expand Button Position" :options="positionOptions" />
      </ConfigCard>
    </div>
  </section>
</template>
