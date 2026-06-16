<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide } from 'vue';
import ConfigToolbar from './components/ConfigToolbar.vue';
import { configStoreKey, createConfigStore } from './libs/store';
import AdvancedTab from './tabs/AdvancedTab.vue';
import AppearanceTab from './tabs/AppearanceTab.vue';
import GeneralTab from './tabs/GeneralTab.vue';
import KeyboardTab from './tabs/KeyboardTab.vue';
import TrailerTab from './tabs/TrailerTab.vue';
import TrickplayTab from './tabs/TrickplayTab.vue';

const store = createConfigStore();
provide(configStoreKey, store);

let initialLoadTimer: number | null = null;
const handlePageShow = () => {
  if (initialLoadTimer) {
    window.clearTimeout(initialLoadTimer);
    initialLoadTimer = null;
  }
  void store.loadConfig();
};

onMounted(() => {
  initialLoadTimer = window.setTimeout(() => {
    initialLoadTimer = null;
    void store.loadConfig();
  }, 0);
  document.querySelector('#MediaPreviewConfigPage')?.addEventListener('pageshow', handlePageShow);
});

onBeforeUnmount(() => {
  if (initialLoadTimer) {
    window.clearTimeout(initialLoadTimer);
  }
  document.querySelector('#MediaPreviewConfigPage')?.removeEventListener('pageshow', handlePageShow);
});
</script>

<template>
  <div class="content-primary">
    <form class="jmp-configForm" @submit.prevent="store.saveConfig">
      <div class="sectionTitleContainer flex align-items-center">
        <h2 class="sectionTitle">Media Preview</h2>
      </div>

      <div class="verticalSection verticalSection-extrabottompadding jmp-intro">
        <p>
          Adds hover previews to Jellyfin cards with Trickplay, trailers, library and type rules,
          keyboard support, and optional metadata overlays. The File Transformation plugin must be
          installed, and preview playback still depends on the data Jellyfin already exposes.
        </p>
      </div>

      <ConfigToolbar />

      <div class="jmp-grid">
        <GeneralTab v-show="store.activeTab.value === 'general'" />
        <KeyboardTab v-show="store.activeTab.value === 'keyboard'" />
        <TrickplayTab v-show="store.activeTab.value === 'trickplay'" />
        <TrailerTab v-show="store.activeTab.value === 'trailer'" />
        <AppearanceTab v-show="store.activeTab.value === 'appearance'" />
        <AdvancedTab v-show="store.activeTab.value === 'advanced'" />
      </div>
    </form>
  </div>
</template>
