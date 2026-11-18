<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { getGlobalApiClient } from '../../core/apiClient';
import { requestJson, sendRequest } from '../libs/jellyfinApi';
import { useConfigStore } from '../libs/store';
import { t } from '../i18n';

interface UnavailableTrailerItem {
  id: string;
  name: string;
  type: string;
  productionYear?: number | null;
}

interface UnavailableTrailerEntry {
  videoId: string;
  errorCode: number;
  lastSeenUtc: string;
  retryAfterUtc: string;
  reportCount: number;
  items: UnavailableTrailerItem[];
}

interface UnavailableTrailerDetails {
  enabled: boolean;
  retryDays: number;
  entries: UnavailableTrailerEntry[];
}

function errorLabel(code: number): string {
  if (code === 100) return t('unavailable.errorRemoved');
  if (code === 101 || code === 150) return t('unavailable.errorEmbedding');
  return t('unavailable.errorOther', { code });
}

const store = useConfigStore();
const details = ref<UnavailableTrailerDetails | null>(null);
const state = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle');
const busy = ref(false);
const actionError = ref('');

async function refresh(): Promise<void> {
  state.value = 'loading';
  try {
    details.value = (await requestJson('media-preview/unavailable-trailers/details')) as UnavailableTrailerDetails;
    state.value = details.value ? 'loaded' : 'error';
  } catch {
    state.value = 'error';
  }
}

watch(
  () => store.activeTab.value,
  (tab) => {
    if (tab === 'trailer' && state.value !== 'loading') {
      void refresh();
    }
  },
  { immediate: true }
);

async function run(path: string): Promise<void> {
  busy.value = true;
  actionError.value = '';
  try {
    await sendRequest('DELETE', path);
    await refresh();
  } catch {
    actionError.value = t('unavailable.resetError');
  } finally {
    busy.value = false;
  }
}

function resetEntry(videoId: string): Promise<void> {
  return run(`media-preview/unavailable-trailers/${encodeURIComponent(videoId)}`);
}

function resetAll(): Promise<void> {
  if (!window.confirm(t('unavailable.confirmResetAll'))) {
    return Promise.resolve();
  }
  return run('media-preview/unavailable-trailers');
}

const serverId = computed(() => getGlobalApiClient()?._serverInfo?.Id || '');

function itemHref(item: UnavailableTrailerItem): string {
  const server = serverId.value ? `&serverId=${encodeURIComponent(serverId.value)}` : '';
  return `#/details?id=${encodeURIComponent(item.id)}${server}`;
}

function itemLabel(item: UnavailableTrailerItem): string {
  return item.productionYear ? `${item.name} (${item.productionYear})` : item.name;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const entries = computed(() => details.value?.entries || []);
</script>

<template>
  <div class="jmp-unavailableTrailers">
    <div class="jmp-unavailableHeader">
      <p class="jmp-unavailableSummary">
        <template v-if="state === 'loading' && !details">{{ t('common.loading') }}</template>
        <template v-else-if="state === 'error'">{{ t('unavailable.loadError') }}</template>
        <template v-else-if="!entries.length">{{ t('unavailable.empty') }}</template>
        <template v-else>
          {{ entries.length === 1 ? t('unavailable.countOne') : t('unavailable.count', { count: entries.length }) }}
        </template>
      </p>
      <button
        v-if="entries.length"
        type="button"
        class="jmp-actionButton jmp-unavailableResetAll"
        :disabled="busy"
        @click="resetAll"
      >
        <span>{{ t('unavailable.resetAll') }}</span>
      </button>
    </div>
    <p v-if="actionError" class="jmp-note jmp-unavailableError">{{ actionError }}</p>

    <ul v-if="entries.length" class="jmp-unavailableList">
      <li v-for="entry in entries" :key="entry.videoId" class="jmp-unavailableEntry">
        <div class="jmp-unavailableMain">
          <div class="jmp-unavailableItems">
            <template v-if="entry.items.length">
              <a v-for="item in entry.items" :key="item.id" :href="itemHref(item)" class="jmp-unavailableItem">
                {{ itemLabel(item) }}
              </a>
            </template>
            <span v-else class="jmp-unavailableMeta">{{ t('unavailable.noItem') }}</span>
          </div>
          <div class="jmp-unavailableMeta">
            <a :href="`https://www.youtube.com/watch?v=${entry.videoId}`" target="_blank" rel="noopener noreferrer">
              {{ entry.videoId }}
            </a>
            · {{ errorLabel(entry.errorCode) }} · {{ t('unavailable.reported', { count: entry.reportCount }) }} ·
            {{ t('unavailable.retryAfter', { date: formatDate(entry.retryAfterUtc) }) }}
          </div>
        </div>
        <button
          type="button"
          class="jmp-actionButton jmp-unavailableReset"
          :disabled="busy"
          :aria-label="t('unavailable.resetNamed', { id: entry.videoId })"
          @click="resetEntry(entry.videoId)"
        >
          <span>{{ t('common.reset') }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.jmp-unavailableTrailers {
  margin-top: 1rem;
}

.jmp-unavailableHeader {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.jmp-unavailableSummary {
  margin: 0;
}

.jmp-unavailableList {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  max-height: 24rem;
  overflow-y: auto;
}

.jmp-unavailableEntry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0;
  border-top: 1px solid var(--jf-palette-divider, rgba(255, 255, 255, 0.14));
}

.jmp-unavailableMain {
  flex: 1;
  min-width: 0;
}

.jmp-unavailableItems {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
}

.jmp-unavailableItem {
  color: inherit;
  font-weight: 600;
}

.jmp-unavailableMeta {
  font-size: 0.85rem;
  opacity: 0.72;
  overflow-wrap: anywhere;
}

.jmp-unavailableMeta a {
  color: inherit;
}

.jmp-unavailableReset,
.jmp-unavailableResetAll {
  flex: none;
  margin: 0;
}

.jmp-unavailableError {
  color: var(--jf-palette-error-main, #ef5350);
}
</style>
