<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { openUserPreferencesDialog } from '../../userPreferences/dialog';
import ConfigActionMenu, { type ConfigMenuAction } from '../components/ConfigActionMenu.vue';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigListHeader from '../components/ConfigListHeader.vue';
import ConfigSwitch from '../components/ConfigSwitch.vue';
import { loadUsers } from '../libs/jellyfinApi';
import { useConfigStore } from '../libs/store';
import type { ConfigUser } from '../libs/types';

const store = useConfigStore();
const users = ref<ConfigUser[]>([]);
const usersState = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle');

async function refreshUsers(): Promise<void> {
  usersState.value = 'loading';
  try {
    users.value = await loadUsers();
    usersState.value = 'loaded';
  } catch {
    usersState.value = 'error';
  }
}

watch(
  () => store.activeTab.value,
  (tab) => {
    if (tab === 'users' && (usersState.value === 'idle' || usersState.value === 'error')) {
      void refreshUsers();
    }
  },
  { immediate: true }
);

const summary = computed(() => {
  if (usersState.value === 'error') return 'Could not load users.';
  if (usersState.value !== 'loaded') return '';
  return users.value.length === 1 ? '1 user' : `${users.value.length} users`;
});

const profileActions = computed((): ConfigMenuAction[] =>
  users.value.map((user) => ({
    id: user.Id,
    label: user.Name,
    icon: user.IsAdministrator ? 'admin_panel_settings' : 'person'
  }))
);

function openUserProfile(userId: string): void {
  const user = users.value.find((candidate) => candidate.Id === userId);
  if (user) {
    void openUserPreferencesDialog({ userId: user.Id, userName: user.Name });
  }
}
</script>

<template>
  <section
    id="mediaPreviewPanel-users"
    class="jmp-section jmp-section-plain"
    data-tab-section="users"
    role="tabpanel"
    aria-labelledby="mediaPreviewTab-users"
  >
    <ConfigListHeader title="User Settings" :summary="summary">
      <template #actions>
        <ConfigActionMenu
          v-if="users.length && store.config.UserAudioPreferencesEnabled"
          label="Open User Profile"
          trigger-text="Open User Profile"
          trigger-icon="manage_accounts"
          :actions="profileActions"
          @select="openUserProfile"
        />
      </template>
    </ConfigListHeader>

    <div class="jmp-subgrid">
      <ConfigCard>
        <ConfigSwitch
          v-model="store.config.UserAudioPreferencesEnabled"
          label="Save Mute and Volume per User"
          class="jmp-userSwitch"
        />
      </ConfigCard>
    </div>
  </section>
</template>

<style scoped>
.jmp-userSwitch {
  margin-bottom: 0.75rem;
}
</style>
