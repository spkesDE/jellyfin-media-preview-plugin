<script setup lang="ts">
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigCheckbox from '../components/ConfigCheckbox.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';
import PreviewCard from '../components/PreviewCard.vue';

const store = useConfigStore();
const previewModeOptions: SelectOption[] = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover', label: 'Cover' },
  { value: 'stretch', label: 'Stretch / Fill' }
];
const portraitExpansionOptions: SelectOption[] = [
  { value: 'off', label: 'Normal' },
  { value: '3:2', label: 'Wide (3:2)' },
  { value: '16:9', label: 'Wide (16:9)' },
  { value: 'source', label: 'Source / Video ratio' }
];
const backdropOptions: SelectOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'dim', label: 'Dim' },
  { value: 'vignette', label: 'Vignette' },
  { value: 'dim-vignette', label: 'Dim + Vignette' },
  { value: 'blur', label: 'Blur' },
  { value: 'dim-blur', label: 'Dim + Blur' }
];
const positionOptions: SelectOption[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' }
];
</script>

<template>
  <section id="mediaPreviewPanel-appearance" class="jmp-section jmp-section-plain" data-tab-section="appearance" role="tabpanel" aria-labelledby="mediaPreviewTab-appearance">
    <div class="jmp-subgrid">
      <ConfigCard class="jmp-appearancePreviewSection" title="Live Preview" help="Updates immediately from the controls below.">
        <div class="jmp-appearancePreviewGrid">
          <PreviewCard kind="portrait" />
          <PreviewCard kind="backdrop" />
        </div>
      </ConfigCard>

      <ConfigCard title="Card Framing" help="Choose how previews should sit inside portrait and backdrop cards.">
        <ConfigSelect v-model="store.config.PortraitCardPreviewMode" label="Portrait Card Preview Mode" :options="previewModeOptions" />
        <ConfigSelect
          v-model="store.config.PortraitCardExpansionMode"
          label="Portrait Card Expansion"
          :options="portraitExpansionOptions"
        />
        <p class="jmp-note">Wide modes smoothly expand portrait cards when a preview starts and move neighboring cards aside.</p>
        <ConfigSelect v-model="store.config.BackdropCardPreviewMode" label="Backdrop Card Preview Mode" :options="previewModeOptions" />
      </ConfigCard>

      <ConfigCard title="Backdrop" help="Style the poster backdrop behind the preview.">
        <ConfigSelect v-model="store.config.PreviewBackdropMode" label="Poster Backdrop" :options="backdropOptions" />
        <p class="jmp-note">Vignette modes avoid CSS blur and are usually the safer choice on weaker devices.</p>
        <ConfigNumber
          v-if="store.config.PreviewBackdropMode !== 'off'"
          v-model="store.config.PreviewBackdropIntensityPercent"
          label="Backdrop Intensity (%)"
          :min="0"
          :max="100"
          :step="1"
        />
      </ConfigCard>

      <ConfigCard title="Overlay Elements" help="Control the small UI elements shown on top of the preview.">
        <ConfigCheckbox v-model="store.config.ShowProgressIndicator" label="Show Progress Indicator" />
        <ConfigCheckbox v-model="store.config.MetadataOverlayEnabled" label="Show Mini Metadata Overlay" />
        <template v-if="store.config.MetadataOverlayEnabled">
          <ConfigSelect v-model="store.config.MetadataOverlayPosition" label="Metadata Overlay Position" :options="positionOptions" />
          <ConfigCheckbox v-model="store.config.MetadataOverlayShowTitle" label="Show Title" />
          <ConfigCheckbox v-model="store.config.MetadataOverlayShowYear" label="Show Year" />
          <ConfigCheckbox v-model="store.config.MetadataOverlayShowRuntime" label="Show Runtime" />
          <ConfigCheckbox v-model="store.config.MetadataOverlayShowOfficialRating" label="Show Official Rating" />
          <ConfigCheckbox v-model="store.config.MetadataOverlayShowCommunityRating" label="Show Community Rating" />
        </template>
      </ConfigCard>
    </div>
  </section>
</template>
