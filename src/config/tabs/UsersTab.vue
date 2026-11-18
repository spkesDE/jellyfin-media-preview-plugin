<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { openUserPreferencesDialog } from '../../userPreferences/dialog';
import { t } from '../i18n';
import ConfigActionMenu, { type ConfigMenuAction } from '../components/ConfigActionMenu.vue';
import ConfigCard from '../components/ConfigCard.vue';
import ConfigListHeader from '../components/ConfigListHeader.vue';
import ConfigSection from '../components/ConfigSection.vue';
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
  const state = store.config.UserAudioPreferencesEnabled ? t('users.summaryOn') : t('users.summaryOff');
  if (usersState.value === 'error') return `${state} · ${t('users.loadError')}`;
  if (usersState.value !== 'loaded') return state;
  const count = users.value.length === 1 ? t('users.countOne') : t('users.count', { count: users.value.length });
  return `${state} · ${count}`;
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
    <ConfigListHeader :title="t('users.title')" :help-text="t('users.help')" :summary="summary">
      <template #actions>
        <ConfigActionMenu
          v-if="users.length && store.config.UserAudioPreferencesEnabled"
          :label="t('users.openProfile')"
          :trigger-text="t('users.openProfile')"
          trigger-icon="manage_accounts"
          :actions="profileActions"
          @select="openUserProfile"
        />
      </template>
    </ConfigListHeader>

    <div class="jmp-subgrid">
      <ConfigCard :title="t('users.cardTitle')">
        <ConfigSection :title="t('users.permissionSection')">
          <ConfigSwitch v-model="store.config.UserAudioPreferencesEnabled" :label="t('users.allow')" />
          <p class="jmp-note">
            {{ store.config.UserAudioPreferencesEnabled ? t('users.allowOnHelp') : t('users.allowOffHelp') }}
          </p>
        </ConfigSection>
      </ConfigCard>
    </div>
  </section>
</template>
