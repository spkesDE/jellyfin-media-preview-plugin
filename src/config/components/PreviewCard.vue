<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useConfigStore } from '../libs/store';

const props = defineProps<{ kind: 'portrait' | 'backdrop' }>();
const store = useConfigStore();
const activeLayer = ref(0);
const hovered = ref(false);

const mode = computed(() =>
  props.kind === 'portrait'
    ? store.config.PortraitCardPreviewMode
    : store.config.BackdropCardPreviewMode
);
const modeLabel = computed(() =>
  mode.value === 'stretch' ? 'Stretch / Fill' : mode.value === 'cover' ? 'Cover' : 'Contain'
);
const cardClass = computed(() => `jmp-appearanceCard-${props.kind}`);
const portraitExpansionClass = computed(() => {
  if (props.kind !== 'portrait' || !hovered.value || store.config.PortraitCardExpansionMode === 'off') {
    return '';
  }

  const previewExpansionMode = store.config.PortraitCardExpansionMode === 'source'
    ? '16:9'
    : store.config.PortraitCardExpansionMode;
  return `jmp-appearanceCard-portrait-wide-${previewExpansionMode.replace(':', '-')}`;
});
const previewLabel = computed(() => {
  if (props.kind !== 'portrait' || store.config.PortraitCardExpansionMode === 'off') {
    return modeLabel.value;
  }

  return `${modeLabel.value} · Wide ${store.config.PortraitCardExpansionMode}`;
});
const posterStyle = computed(() =>
  store.appearance.value.posterUrl
    ? { backgroundImage: `url("${store.appearance.value.posterUrl.replace(/"/g, '%22')}")` }
    : undefined
);
const mediaStyle = computed(() => ({
  backgroundImage: store.appearance.value.previewUrl
    ? `url("${store.appearance.value.previewUrl.replace(/"/g, '%22')}")`
    : undefined,
  transitionDuration: `${Math.max(0, store.config.PreviewTransitionDurationMs)}ms`
}));
const backdropStyle = computed(() => {
  const intensity = Math.max(0, Math.min(100, store.config.PreviewBackdropIntensityPercent)) / 100;
  const backdropMode = store.config.PreviewBackdropMode;
  let background = 'transparent';
  let backdropFilter = 'none';

  if (['dim', 'dim-blur', 'dim-vignette'].includes(backdropMode)) {
    background = `rgba(0, 0, 0, ${Math.min(0.8, intensity * 0.75).toFixed(3)})`;
  }
  if (['vignette', 'dim-vignette'].includes(backdropMode)) {
    const inner = Math.min(0.45, intensity * 0.18).toFixed(3);
    const outer = Math.min(0.92, 0.22 + intensity * 0.62).toFixed(3);
    const vignette = `radial-gradient(circle at center, rgba(0, 0, 0, ${inner}) 22%, rgba(0, 0, 0, ${outer}) 100%)`;
    background = backdropMode === 'dim-vignette' ? `${vignette}, ${background}` : vignette;
  }
  if (['blur', 'dim-blur'].includes(backdropMode)) {
    backdropFilter = `blur(${Math.max(1, Math.round(4 + intensity * 12))}px)`;
  }
  return { background, backdropFilter, WebkitBackdropFilter: backdropFilter };
});
const title = computed(() => store.config.MetadataOverlayShowTitle ? store.appearance.value.title : '');
const metadata = computed(() => [
  store.config.MetadataOverlayShowYear ? store.appearance.value.year : '',
  store.config.MetadataOverlayShowRuntime ? store.appearance.value.runtime : '',
  store.config.MetadataOverlayShowOfficialRating ? store.appearance.value.officialRating : '',
  store.config.MetadataOverlayShowCommunityRating ? store.appearance.value.communityRating : ''
].filter(Boolean).join(' \u2022 '));
const showMetadata = computed(() =>
  store.config.MetadataOverlayEnabled && !!(title.value || metadata.value)
);

watch(
  () => [
    mode.value,
    store.config.PortraitCardExpansionMode,
    store.config.PreviewBackdropMode,
    store.config.PreviewBackdropIntensityPercent,
    store.config.MetadataOverlayEnabled,
    store.config.MetadataOverlayPosition,
    store.config.ShowProgressIndicator
  ],
  () => {
    if (store.config.PreviewTransitionMode !== 'off') {
      activeLayer.value = activeLayer.value === 0 ? 1 : 0;
    }
  }
);
</script>

<template>
  <div class="jmp-appearancePreviewItem">
    <div class="jmp-appearancePreviewLabel">
      <span>{{ kind === 'portrait' ? 'Portrait card' : 'Backdrop card' }}</span>
      <span class="jmp-badge jmp-badge-muted">{{ previewLabel }}</span>
    </div>
    <div
      class="jmp-appearanceCard"
      :class="[cardClass, portraitExpansionClass, { 'has-library-artwork': store.appearance.value.previewUrl }]"
      @mouseenter="hovered = true"
      @mouseleave="hovered = false"
    >
      <div class="jmp-appearancePoster" :style="posterStyle" />
      <div class="jmp-appearanceBackdrop" :style="backdropStyle" />
      <div
        v-for="layer in [0, 1]"
        :key="layer"
        class="jmp-appearanceMedia"
        :class="[`fit-${mode}`, { 'is-alt': layer === 1 }]"
        :style="{ ...mediaStyle, opacity: activeLayer === layer ? 1 : 0 }"
      />
      <div
        v-if="showMetadata"
        class="jmp-metadata-overlay"
        :class="`pos-${store.config.MetadataOverlayPosition}`"
        style="display: flex"
      >
        <div v-if="title" class="jmp-metadata-title">{{ title }}</div>
        <div v-if="metadata" class="jmp-metadata-meta">{{ metadata }}</div>
      </div>
      <div v-if="store.config.ShowProgressIndicator" class="jmp-progress" style="display: block">
        <div class="jmp-progress-bar" />
      </div>
    </div>
  </div>
</template>
