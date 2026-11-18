<script setup lang="ts">
import ConfigSwitch from './ConfigSwitch.vue';

/** Kept for existing call sites; every on/off setting is shown as a switch, like in Jellyfin Featured. */
defineProps<{ label: string; modelValue?: unknown; disabled?: boolean; helpText?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <ConfigSwitch
    :label="label"
    :model-value="modelValue"
    :disabled="disabled"
    :help-text="helpText"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
