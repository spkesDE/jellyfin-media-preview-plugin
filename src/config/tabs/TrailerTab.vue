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
import UnavailableTrailersPanel from '../components/UnavailableTrailersPanel.vue';

const store = useConfigStore();
const detailSourceOptions = computed<SelectOption[]>(() => [
  { value: 'prefer-trailer', label: t('trailer.detailSourcePreferTrailer') },
  { value: 'trailer', label: t('trailer.detailSourceTrailer') },
  { value: 'prefer-direct-play', label: t('trailer.detailSourcePreferDirect') },
  { value: 'direct-play', label: t('trailer.detailSourceDirect') }
]);
const cropOptions = computed<SelectOption[]>(() => [
  { value: 'off', label: t('trailer.cropOff') },
  { value: 'light', label: t('trailer.cropLight') },
  { value: 'medium', label: t('trailer.cropMedium') },
  { value: 'strong', label: t('trailer.cropStrong') }
]);

const directOff = computed(() => !store.config.DirectPlayPreviewEnabled);

const summary = computed(() =>
  [
    store.config.TrailerAudioEnabled
      ? t('trailer.summaryAudio', { percent: Number(store.config.TrailerVolumePercent) || 0 })
      : t('trailer.summaryMuted'),
    store.config.DirectPlayPreviewEnabled ? t('trailer.summaryDirectPlay') : null,
    store.config.DirectPlayPreviewEnabled && store.config.DirectPlayRemuxEnabled ? t('trailer.summaryRemux') : null,
    store.config.DetailPreviewEnabled ? t('trailer.summaryDetail') : null
  ]
    .filter(Boolean)
    .join(' · ')
);
</script>

<template>
  <section
    id="mediaPreviewPanel-trailer"
    class="jmp-section jmp-section-plain"
    data-tab-section="trailer"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-trailer"
  >
    <ConfigListHeader :title="t('trailer.title')" :help-text="t('trailer.help')" :summary="summary" />

    <div class="jmp-columns">
      <div class="jmp-column">
        <ConfigCard :title="t('trailer.playbackTitle')">
          <ConfigSection :title="t('trailer.audioSection')" :help-text="t('trailer.audioHelp')">
            <ConfigSwitch v-model="store.config.TrailerAudioEnabled" :label="t('trailer.audio')" />
            <ConfigNumber
              v-if="store.config.TrailerAudioEnabled"
              v-model="store.config.TrailerVolumePercent"
              :label="t('trailer.volume')"
              :min="0"
              :max="100"
              :step="1"
            />
          </ConfigSection>
          <ConfigSection :title="t('trailer.embedSection')">
            <ConfigSelect
              v-model="store.config.YouTubeCropStrength"
              :label="t('trailer.crop')"
              :help-text="t('trailer.cropHelp')"
              :options="cropOptions"
            />
          </ConfigSection>
        </ConfigCard>

        <ConfigCard :title="t('trailer.directTitle')" :help="t('trailer.directHelp')">
          <ConfigSection :title="t('trailer.directSection')">
            <ConfigSwitch v-model="store.config.DirectPlayPreviewEnabled" :label="t('trailer.directEnable')" />
            <ConfigGrid :columns="3">
              <ConfigNumber
                v-model="store.config.DirectPlayStartPercent"
                :label="t('trailer.startPercent')"
                :help-text="t('trailer.startPercentHelp')"
                :min="0"
                :max="90"
                :step="1"
                :disabled="directOff"
              />
              <ConfigNumber
                v-model="store.config.DirectPlayPlaybackRate"
                :label="t('trailer.speed')"
                :min="0.5"
                :max="2"
                :step="0.25"
                :disabled="directOff"
              />
              <ConfigNumber
                v-model="store.config.DirectPlayPreviewDurationSeconds"
                :label="t('trailer.duration')"
                :zero-label="t('common.unlimited')"
                :min="0"
                :max="300"
                :step="1"
                :disabled="directOff"
              />
            </ConfigGrid>
            <ConfigSwitch
              v-model="store.config.DirectPlaySkipSegmentsEnabled"
              :label="t('trailer.skipSegments')"
              :help-text="t('trailer.skipSegmentsHelp')"
              :disabled="directOff"
            />
          </ConfigSection>

          <ConfigSection :title="t('trailer.serverSection')" :help-text="t('trailer.serverHelp')">
            <ConfigSwitch
              v-model="store.config.DirectPlayRemuxEnabled"
              :label="t('trailer.remux')"
              :help-text="t('trailer.remuxHelp')"
              :disabled="directOff"
            />
            <ConfigSwitch
              v-model="store.config.DirectPlayTranscodeFallbackEnabled"
              :label="t('trailer.transcode')"
              :help-text="t('trailer.transcodeHelp')"
              :disabled="directOff"
            />
            <ConfigGrid v-if="store.config.DirectPlayTranscodeFallbackEnabled">
              <ConfigNumber
                v-model="store.config.DirectPlayTranscodeMaxHeight"
                :label="t('trailer.maxHeight')"
                :min="240"
                :max="2160"
                :step="120"
                :disabled="directOff"
              />
              <ConfigNumber
                v-model="store.config.DirectPlayTranscodeVideoBitrateKbps"
                :label="t('trailer.maxBitrate')"
                :min="250"
                :max="20000"
                :step="250"
                :disabled="directOff"
              />
            </ConfigGrid>
          </ConfigSection>
        </ConfigCard>
      </div>
      <div class="jmp-column">
        <ConfigCard :title="t('trailer.detailTitle')" :badge="t('common.experimental')" badge-tone="wip">
          <ConfigSection :title="t('trailer.detailSection')" :help-text="t('trailer.detailHelp')">
            <ConfigSwitch v-model="store.config.DetailPreviewEnabled" :label="t('trailer.detailEnable')" />
            <ConfigGrid v-if="store.config.DetailPreviewEnabled">
              <ConfigSelect
                v-model="store.config.DetailPreviewSource"
                :label="t('trailer.detailSource')"
                :options="detailSourceOptions"
              />
              <ConfigNumber
                v-model="store.config.DetailPreviewDelayMs"
                :label="t('trailer.detailDelay')"
                :min="0"
                :max="10000"
                :step="250"
              />
            </ConfigGrid>
          </ConfigSection>
        </ConfigCard>

        <ConfigCard :title="t('trailer.unavailableTitle')">
          <ConfigSection :title="t('trailer.unavailableSection')" :help-text="t('trailer.unavailableHelp')">
            <ConfigSwitch
              v-model="store.config.UnavailableTrailerCacheEnabled"
              :label="t('trailer.unavailableEnable')"
            />
            <ConfigNumber
              v-if="store.config.UnavailableTrailerCacheEnabled"
              v-model="store.config.UnavailableTrailerRetryDays"
              :label="t('trailer.retryDays')"
              :min="1"
              :max="365"
              :step="1"
            />
            <p v-else class="jmp-note">{{ t('trailer.unavailableOff') }}</p>
          </ConfigSection>
          <ConfigSection :title="t('trailer.unavailableListSection')">
            <UnavailableTrailersPanel />
          </ConfigSection>
        </ConfigCard>
      </div>
    </div>
  </section>
</template>
