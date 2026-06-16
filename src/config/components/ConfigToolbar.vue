<script setup lang="ts">
import { nextTick } from 'vue';
import { useConfigStore } from '../libs/store';
import type { ConfigTab } from '../libs/types';

const store = useConfigStore();
const tabs: Array<{ id: ConfigTab; label: string; badge?: string }> = [
  { id: 'general', label: 'General' },
  { id: 'keyboard', label: 'Keyboard', badge: 'WIP' },
  { id: 'trickplay', label: 'Trickplay' },
  { id: 'trailer', label: 'Trailer' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'advanced', label: 'Advanced' }
];

function isVisible(tab: ConfigTab): boolean {
  return (tab !== 'trailer' || store.canUseTrailer.value)
    && (tab !== 'trickplay' || store.canUseTrickplay.value);
}

function select(tab: ConfigTab): void {
  store.selectTab(tab);
}

async function handleKeydown(event: KeyboardEvent, tab: ConfigTab): Promise<void> {
  const visibleTabs = tabs.filter((candidate) => isVisible(candidate.id));
  const currentIndex = visibleTabs.findIndex((candidate) => candidate.id === tab);
  let nextIndex = currentIndex;

  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % visibleTabs.length;
  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = visibleTabs.length - 1;
  else return;

  event.preventDefault();
  const nextTab = visibleTabs[nextIndex].id;
  select(nextTab);
  await nextTick();
  document.querySelector<HTMLButtonElement>(`[data-tab-target="${nextTab}"]`)?.focus();
}
</script>

<template>
  <div class="jmp-toolbar">
    <div class="jmp-tabBar" role="tablist" aria-label="Media Preview settings">
      <button
        v-for="tab in tabs"
        v-show="isVisible(tab.id)"
        :key="tab.id"
        type="button"
        :id="`mediaPreviewTab-${tab.id}`"
        class="jmp-tabButton"
        :class="{ 'is-active': store.activeTab.value === tab.id }"
        :data-tab-target="tab.id"
        role="tab"
        :aria-controls="`mediaPreviewPanel-${tab.id}`"
        :aria-selected="store.activeTab.value === tab.id ? 'true' : 'false'"
        :tabindex="store.activeTab.value === tab.id ? 0 : -1"
        @click="select(tab.id)"
        @keydown="handleKeydown($event, tab.id)"
      >
        {{ tab.label }}
        <span v-if="tab.badge" class="jmp-badge jmp-badge-wip">{{ tab.badge }}</span>
      </button>
    </div>

    <button
      type="submit"
      class="raised button-submit emby-button jmp-saveButton"
      :class="{
        'is-dirty': store.saveState.value === 'dirty',
        'is-saved': store.saveState.value === 'saved'
      }"
      :disabled="store.loading.value"
    >
      <span>{{ store.saveState.value === 'saved' ? 'Saved' : 'Save' }}</span>
    </button>
  </div>
</template>
