<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { t } from '../i18n';
import { useConfigStore } from '../libs/store';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigGrid from '../components/ConfigGrid.vue';
import ConfigListHeader from '../components/ConfigListHeader.vue';
import ConfigMultiPicker from '../components/ConfigMultiPicker.vue';
import ConfigNumber from '../components/ConfigNumber.vue';
import ConfigSection from '../components/ConfigSection.vue';
import ConfigSelect, { type SelectOption } from '../components/ConfigSelect.vue';
import ConfigSwitch from '../components/ConfigSwitch.vue';
import PreviewCard from '../components/PreviewCard.vue';

const store = useConfigStore();
const previewModeOptions = computed<SelectOption[]>(() => [
  { value: 'contain', label: t('appearance.modeContain') },
  { value: 'cover', label: t('appearance.modeCover') },
  { value: 'stretch', label: t('appearance.modeStretch') }
]);
const portraitExpansionOptions = computed<SelectOption[]>(() => [
  { value: 'off', label: t('appearance.expansionOff') },
  { value: '3:2', label: t('appearance.expansion32') },
  { value: '16:9', label: t('appearance.expansion169') },
  { value: 'source', label: t('appearance.expansionSource') }
]);
const portraitExpansionLayoutOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: t('appearance.layoutAll') },
  { value: 'horizontal-only', label: t('appearance.layoutHorizontal') },
  { value: 'compress', label: t('appearance.layoutCompress') }
]);
const portraitCompressionOptions = computed<SelectOption[]>(() => [
  { value: 'distance', label: t('appearance.compressionDistance') },
  { value: 'neighbors', label: t('appearance.compressionNeighbors') }
]);
const backdropOptions = computed<SelectOption[]>(() => [
  { value: 'off', label: t('appearance.backdropOff') },
  { value: 'dim', label: t('appearance.backdropDim') },
  { value: 'vignette', label: t('appearance.backdropVignette') },
  { value: 'dim-vignette', label: t('appearance.backdropDimVignette') },
  { value: 'blur', label: t('appearance.backdropBlur') },
  { value: 'dim-blur', label: t('appearance.backdropDimBlur') }
]);
const transitionOptions = computed<SelectOption[]>(() => [
  { value: 'off', label: t('appearance.transitionOff') },
  { value: 'fade', label: t('appearance.transitionFade') },
  { value: 'crossfade', label: t('appearance.transitionCrossfade') }
]);
const positionOptions = computed<SelectOption[]>(() => [
  { value: 'top-left', label: t('position.topLeft') },
  { value: 'top-right', label: t('position.topRight') },
  { value: 'bottom-left', label: t('position.bottomLeft') },
  { value: 'bottom-right', label: t('position.bottomRight') }
]);
const mediaControlSourceOptions = computed<SelectOption[]>(() => [
  { value: 'local-trailer', label: t('chain.localTrailerShort') },
  { value: 'remote-trailer', label: t('chain.remoteTrailerShort') },
  { value: 'direct-play', label: t('chain.directPlayShort') }
]);

const layoutHelp = computed(() => {
  if (store.config.PortraitCardExpansionLayoutMode === 'all') return t('appearance.layoutAllHelp');
  if (store.config.PortraitCardExpansionLayoutMode === 'horizontal-only') return t('appearance.layoutHorizontalHelp');
  return t('appearance.layoutCompressHelp');
});

const summary = computed(() =>
  [
    portraitExpansionOptions.value.find((option) => option.value === store.config.PortraitCardExpansionMode)?.label,
    backdropOptions.value.find((option) => option.value === store.config.PreviewBackdropMode)?.label,
    store.config.MetadataOverlayEnabled ? t('appearance.summaryMetadata') : null
  ]
    .filter(Boolean)
    .join(' · ')
);

/* Accordion: one group open at a time, as in Jellyfin Featured's Display tab. */
const editor = ref<HTMLElement | null>(null);

function focusGroup(event: Event): void {
  const current = event.currentTarget as HTMLDetailsElement;
  if (!current.open) return;
  editor.value?.querySelectorAll<HTMLDetailsElement>('details.jmp-displayGroup').forEach((entry) => {
    if (entry !== current) entry.open = false;
  });
}

/* The live preview follows the page while scrolling, but never past the end of the settings column. */
const previewRail = ref<HTMLElement | null>(null);
const previewOffset = ref(0);
let previewFrame = 0;
let previewResizeObserver: ResizeObserver | null = null;

const previewPositionStyle = computed(() => ({
  transform: previewOffset.value ? `translateY(${previewOffset.value}px)` : undefined
}));

function updatePreviewPosition(): void {
  previewFrame = 0;
  const rail = previewRail.value;
  const settings = editor.value;
  const preview = rail?.firstElementChild as HTMLElement | null;
  if (!rail || !settings || !preview || window.innerWidth <= 1050) {
    previewOffset.value = 0;
    return;
  }

  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const appBarOffset = rootFontSize * 4;
  const toolbar = document.querySelector<HTMLElement>('#MediaPreviewConfigPage .jmp-toolbar');
  const toolbarRect = toolbar?.getBoundingClientRect();
  const visibleToolbarBottom =
    toolbarRect && toolbarRect.bottom > appBarOffset && toolbarRect.top <= appBarOffset + 1
      ? toolbarRect.bottom + rootFontSize
      : appBarOffset;
  const railRect = rail.getBoundingClientRect();
  const maximumOffset = Math.max(0, settings.offsetHeight - preview.offsetHeight);
  previewOffset.value = Math.min(maximumOffset, Math.max(0, visibleToolbarBottom - railRect.top));
}

function schedulePreviewPosition(): void {
  if (previewFrame) return;
  previewFrame = window.requestAnimationFrame(updatePreviewPosition);
}

onMounted(() => {
  document.addEventListener('scroll', schedulePreviewPosition, true);
  window.addEventListener('resize', schedulePreviewPosition);
  if (typeof ResizeObserver === 'function') {
    previewResizeObserver = new ResizeObserver(schedulePreviewPosition);
    if (editor.value) previewResizeObserver.observe(editor.value);
    if (previewRail.value?.firstElementChild) previewResizeObserver.observe(previewRail.value.firstElementChild);
  }
  schedulePreviewPosition();
});

onBeforeUnmount(() => {
  document.removeEventListener('scroll', schedulePreviewPosition, true);
  window.removeEventListener('resize', schedulePreviewPosition);
  previewResizeObserver?.disconnect();
  if (previewFrame) window.cancelAnimationFrame(previewFrame);
});
</script>

<template>
  <section
    id="mediaPreviewPanel-appearance"
    class="jmp-section jmp-section-plain"
    data-tab-section="appearance"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-appearance"
  >
    <ConfigListHeader :title="t('appearance.title')" :help-text="t('appearance.help')" :summary="summary" />

    <div class="jmp-displayWorkspace">
      <div ref="editor" class="jmp-displayEditor">
        <details class="jmp-displayGroup jmp-configCard" open @toggle="focusGroup($event)">
          <summary>
            <span class="material-icons" aria-hidden="true">crop</span
            ><span
              ><strong>{{ t('appearance.framingTitle') }}</strong
              ><small>{{ t('appearance.framingHelp') }}</small></span
            ><span class="material-icons jmp-displayGroupChevron" aria-hidden="true">expand_more</span>
          </summary>
          <div class="jmp-displayGroupBody">
            <ConfigSection :title="t('appearance.portraitSection')">
              <ConfigGrid>
                <ConfigSelect
                  v-model="store.config.PortraitCardPreviewMode"
                  :label="t('appearance.portraitMode')"
                  :options="previewModeOptions"
                />
                <ConfigSelect
                  v-model="store.config.PortraitCardExpansionMode"
                  :label="t('appearance.portraitExpansion')"
                  :options="portraitExpansionOptions"
                />
              </ConfigGrid>
              <template v-if="store.config.PortraitCardExpansionMode !== 'off'">
                <ConfigSelect
                  v-model="store.config.PortraitCardExpansionLayoutMode"
                  :label="t('appearance.expansionLayout')"
                  :help-text="layoutHelp"
                  :options="portraitExpansionLayoutOptions"
                />
                <template v-if="store.config.PortraitCardExpansionLayoutMode === 'compress'">
                  <ConfigSelect
                    v-model="store.config.PortraitCardCompressionMode"
                    :label="t('appearance.compression')"
                    :options="portraitCompressionOptions"
                  />
                  <ConfigSwitch
                    v-model="store.config.PortraitCardRowLockEnabled"
                    :label="t('appearance.rowLock')"
                    :help-text="t('appearance.rowLockHelp')"
                  />
                </template>
              </template>
            </ConfigSection>
            <ConfigSection :title="t('appearance.backdropCardSection')">
              <ConfigSelect
                v-model="store.config.BackdropCardPreviewMode"
                :label="t('appearance.backdropCardMode')"
                :options="previewModeOptions"
              />
            </ConfigSection>
          </div>
        </details>

        <details class="jmp-displayGroup jmp-configCard" @toggle="focusGroup($event)">
          <summary>
            <span class="material-icons" aria-hidden="true">auto_awesome</span
            ><span
              ><strong>{{ t('appearance.effectsTitle') }}</strong
              ><small>{{ t('appearance.effectsHelp') }}</small></span
            ><span class="material-icons jmp-displayGroupChevron" aria-hidden="true">expand_more</span>
          </summary>
          <div class="jmp-displayGroupBody">
            <ConfigSection :title="t('appearance.backdropSection')" :help-text="t('appearance.backdropHelp')">
              <ConfigGrid>
                <ConfigSelect
                  v-model="store.config.PreviewBackdropMode"
                  :label="t('appearance.backdrop')"
                  :options="backdropOptions"
                />
                <ConfigNumber
                  v-model="store.config.PreviewBackdropIntensityPercent"
                  :label="t('appearance.backdropIntensity')"
                  :min="0"
                  :max="100"
                  :step="1"
                  :disabled="store.config.PreviewBackdropMode === 'off'"
                />
              </ConfigGrid>
            </ConfigSection>
            <ConfigSection :title="t('appearance.transitionSection')">
              <ConfigGrid>
                <ConfigSelect
                  v-model="store.config.PreviewTransitionMode"
                  :label="t('appearance.transition')"
                  :options="transitionOptions"
                />
                <ConfigNumber
                  v-model="store.config.PreviewTransitionDurationMs"
                  :label="t('appearance.transitionDuration')"
                  :min="0"
                  :max="2000"
                  :step="20"
                  :disabled="store.config.PreviewTransitionMode === 'off'"
                />
              </ConfigGrid>
            </ConfigSection>
          </div>
        </details>

        <details class="jmp-displayGroup jmp-configCard" @toggle="focusGroup($event)">
          <summary>
            <span class="material-icons" aria-hidden="true">smart_button</span
            ><span
              ><strong>{{ t('appearance.controlsTitle') }}</strong
              ><small>{{ t('appearance.controlsHelp') }}</small></span
            ><span class="material-icons jmp-displayGroupChevron" aria-hidden="true">expand_more</span>
          </summary>
          <div class="jmp-displayGroupBody">
            <ConfigSection :title="t('appearance.playbackControlsSection')">
              <ConfigMultiPicker
                v-model="store.config.VideoControlSources"
                :label="t('appearance.videoControls')"
                :help-text="t('appearance.videoControlsHelp')"
                :options="mediaControlSourceOptions"
              />
              <ConfigMultiPicker
                v-model="store.config.AudioControlSources"
                :label="t('appearance.audioControls')"
                :help-text="t('appearance.audioControlsHelp')"
                :options="mediaControlSourceOptions"
              />
            </ConfigSection>
            <ConfigSection :title="t('appearance.cardButtonsSection')">
              <ConfigSwitch v-model="store.config.TrailerExpandButtonEnabled" :label="t('appearance.expandButton')" />
              <ConfigSelect
                v-if="store.config.TrailerExpandButtonEnabled"
                v-model="store.config.TrailerExpandButtonPosition"
                :label="t('appearance.expandButtonPosition')"
                :options="positionOptions"
              />
              <ConfigSwitch v-model="store.config.ShowProgressIndicator" :label="t('appearance.progress')" />
            </ConfigSection>
          </div>
        </details>

        <details class="jmp-displayGroup jmp-configCard" @toggle="focusGroup($event)">
          <summary>
            <span class="material-icons" aria-hidden="true">info</span
            ><span
              ><strong>{{ t('appearance.metadataSection') }}</strong
              ><small>{{ t('appearance.metadataHelp') }}</small></span
            ><span class="material-icons jmp-displayGroupChevron" aria-hidden="true">expand_more</span>
          </summary>
          <div class="jmp-displayGroupBody">
            <ConfigSwitch v-model="store.config.MetadataOverlayEnabled" :label="t('appearance.metadata')" />
            <template v-if="store.config.MetadataOverlayEnabled">
              <ConfigSelect
                v-model="store.config.MetadataOverlayPosition"
                :label="t('appearance.metadataPosition')"
                :options="positionOptions"
              />
              <ConfigSection :title="t('appearance.metadataFieldsSection')">
                <div class="jmp-switchGrid">
                  <ConfigSwitch v-model="store.config.MetadataOverlayShowTitle" :label="t('appearance.metaTitle')" />
                  <ConfigSwitch v-model="store.config.MetadataOverlayShowYear" :label="t('appearance.metaYear')" />
                  <ConfigSwitch
                    v-model="store.config.MetadataOverlayShowRuntime"
                    :label="t('appearance.metaRuntime')"
                  />
                  <ConfigSwitch
                    v-model="store.config.MetadataOverlayShowOfficialRating"
                    :label="t('appearance.metaOfficialRating')"
                  />
                  <ConfigSwitch
                    v-model="store.config.MetadataOverlayShowCommunityRating"
                    :label="t('appearance.metaCommunityRating')"
                  />
                </div>
              </ConfigSection>
            </template>
          </div>
        </details>
      </div>

      <div ref="previewRail" class="jmp-previewRail">
        <ConfigCard
          class="jmp-previewSection"
          :style="previewPositionStyle"
          :title="t('appearance.livePreview')"
          :help="t('appearance.livePreviewHelp')"
        >
          <div class="jmp-appearancePreviewGrid">
            <PreviewCard kind="portrait" />
            <PreviewCard kind="backdrop" />
          </div>
        </ConfigCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
.jmp-displayWorkspace {
  align-items: start;
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(25rem, 1.25fr) minmax(24rem, 0.9fr);
}
.jmp-displayEditor {
  display: grid;
  gap: 0.75rem;
}
.jmp-displayGroup {
  overflow: hidden;
}
.jmp-displayGroup > summary {
  align-items: center;
  cursor: pointer;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  list-style: none;
  padding: 0.85rem 1rem;
}
.jmp-displayGroup > summary::-webkit-details-marker {
  display: none;
}
.jmp-displayGroup > summary > span:nth-child(2) {
  display: grid;
  gap: 0.1rem;
}
.jmp-displayGroup > summary small {
  font-size: 0.78rem;
  font-weight: 400;
  opacity: 0.65;
}
.jmp-displayGroupChevron {
  transition: transform 0.16s ease;
}
.jmp-displayGroup[open] .jmp-displayGroupChevron {
  transform: rotate(180deg);
}
.jmp-displayGroupBody {
  border-top: 1px solid var(--jmp-theme-divider);
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
}
.jmp-displayGroupBody :deep(.inputContainer),
.jmp-displayGroupBody :deep(.selectContainer) {
  margin-bottom: 0;
}
.jmp-previewRail {
  align-self: stretch;
  min-width: 0;
}
.jmp-previewSection {
  box-sizing: border-box;
  position: relative;
  will-change: transform;
}
@media (max-width: 1050px) {
  .jmp-displayWorkspace {
    grid-template-columns: 1fr;
  }
  .jmp-previewRail {
    grid-row: 1;
  }
  .jmp-previewSection {
    transform: none !important;
  }
}
@media (prefers-reduced-motion: reduce) {
  .jmp-displayGroupChevron {
    transition: none;
  }
}
</style>
