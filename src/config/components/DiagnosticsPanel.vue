<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { requestJson } from '../libs/jellyfinApi';
import { useConfigStore } from '../libs/store';
import { t } from '../i18n';

interface BundleDiagnostics {
  valid: boolean;
  sizeBytes: number;
  error?: string | null;
}

interface Diagnostics {
  pluginVersion: string;
  configuredMethod: string;
  activeMethod: string;
  lastRegistrationSucceeded: boolean;
  lastRegistrationUtc: string | null;
  pluginDiscoveryComplete: boolean;
  fileTransformationAvailable: boolean;
  javaScriptInjectorAvailable: boolean;
  directInjectionAvailable: boolean;
  directLoaderInIndex: boolean | null;
  clientBundle: BundleDiagnostics;
  configBundle: BundleDiagnostics;
}

const store = useConfigStore();
const diagnostics = ref<Diagnostics | null>(null);
const state = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle');

async function refresh(): Promise<void> {
  state.value = 'loading';
  try {
    diagnostics.value = (await requestJson('media-preview/config/diagnostics')) as Diagnostics | null;
    state.value = diagnostics.value ? 'loaded' : 'error';
  } catch {
    state.value = 'error';
  }
}

watch(
  () => store.activeTab.value,
  (tab) => {
    if (tab === 'advanced' && state.value !== 'loading') {
      void refresh();
    }
  },
  { immediate: true }
);

function methodLabel(method: string | undefined): string {
  const labels: Record<string, string> = {
    automatic: t('advanced.methodAutomatic'),
    'file-transformation': t('advanced.injectionFileTransformation'),
    'javascript-injector': t('advanced.injectionJavaScriptInjector'),
    direct: t('advanced.injectionDirect'),
    none: t('diagnostics.none')
  };
  return labels[method || 'none'] || method || t('diagnostics.none');
}

function bundleLabel(bundle: BundleDiagnostics | undefined): string {
  if (!bundle) return t('diagnostics.unknown');
  if (!bundle.valid)
    return bundle.error ? t('diagnostics.invalidWith', { error: bundle.error }) : t('diagnostics.invalid');
  return t('diagnostics.valid', { size: Math.round(bundle.sizeBytes / 1024) });
}

function yesNo(value: boolean | null | undefined): string {
  return value === null || value === undefined ? t('diagnostics.unknown') : value ? t('common.yes') : t('common.no');
}

const rows = computed(() => {
  const value = diagnostics.value;
  if (!value) return [];
  const registeredAt = value.lastRegistrationUtc
    ? new Date(value.lastRegistrationUtc).toLocaleString()
    : t('diagnostics.notYet');
  return [
    { label: t('diagnostics.version'), value: value.pluginVersion, ok: true },
    { label: t('diagnostics.configuredMethod'), value: methodLabel(value.configuredMethod), ok: true },
    {
      label: t('diagnostics.activeMethod'),
      value: methodLabel(value.activeMethod),
      ok: value.activeMethod !== 'none'
    },
    {
      label: t('diagnostics.lastRegistration'),
      value: `${registeredAt} · ${value.lastRegistrationSucceeded ? t('diagnostics.succeeded') : t('diagnostics.failed')}`,
      ok: value.lastRegistrationSucceeded
    },
    { label: t('diagnostics.discovery'), value: yesNo(value.pluginDiscoveryComplete), ok: true },
    { label: t('diagnostics.fileTransformation'), value: yesNo(value.fileTransformationAvailable), ok: true },
    { label: t('diagnostics.javaScriptInjector'), value: yesNo(value.javaScriptInjectorAvailable), ok: true },
    { label: t('diagnostics.indexWritable'), value: yesNo(value.directInjectionAvailable), ok: true },
    {
      label: t('diagnostics.loaderInIndex'),
      value: yesNo(value.directLoaderInIndex),
      // A leftover direct loader next to a helper would load the script twice.
      ok: !(value.directLoaderInIndex && value.activeMethod !== 'direct')
    },
    {
      label: t('diagnostics.clientBundle'),
      value: bundleLabel(value.clientBundle),
      ok: value.clientBundle?.valid !== false
    },
    {
      label: t('diagnostics.configBundle'),
      value: bundleLabel(value.configBundle),
      ok: value.configBundle?.valid !== false
    }
  ];
});
</script>

<template>
  <div class="jmp-diagnostics">
    <p v-if="state === 'loading' && !diagnostics" class="jmp-note">{{ t('diagnostics.loading') }}</p>
    <p v-else-if="state === 'error'" class="jmp-note">{{ t('diagnostics.loadError') }}</p>
    <dl v-if="diagnostics" class="jmp-diagnosticsList">
      <template v-for="row in rows" :key="row.label">
        <dt>{{ row.label }}</dt>
        <dd :class="{ 'is-warning': !row.ok }">{{ row.value }}</dd>
      </template>
    </dl>
    <button
      type="button"
      class="jmp-actionButton jmp-diagnosticsRefresh"
      :disabled="state === 'loading'"
      @click="refresh"
    >
      <span>{{ t('common.refresh') }}</span>
    </button>
  </div>
</template>

<style scoped>
.jmp-diagnosticsList {
  display: grid;
  grid-template-columns: minmax(10rem, max-content) 1fr;
  gap: 0.35rem 1rem;
  margin: 0 0 0.75rem;
}

.jmp-diagnosticsList dt {
  opacity: 0.72;
}

.jmp-diagnosticsList dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.jmp-diagnosticsList dd.is-warning {
  color: var(--jf-palette-warning-main, #ffb74d);
  font-weight: 600;
}

@media (max-width: 30rem) {
  .jmp-diagnosticsList {
    grid-template-columns: 1fr;
  }

  .jmp-diagnosticsList dd {
    margin-bottom: 0.4rem;
  }
}
</style>
