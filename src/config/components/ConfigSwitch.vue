<script setup lang="ts">
import { useId } from 'vue';
import ConfigHelpTooltip from './ConfigHelpTooltip.vue';

defineProps<{ label: string; helpText?: string; modelValue?: unknown; disabled?: boolean; hideLabel?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const fieldId = useId();
</script>

<template>
  <div class="jmp-switchRow" :class="{ 'is-labelHidden': hideLabel }">
    <div v-if="!hideLabel" class="jmp-switchLabelRow ec-configLabelRow">
      <label class="jmp-switchLabel" :for="fieldId">{{ label }}</label>
      <ConfigHelpTooltip v-if="helpText" :text="helpText" :label="`${label}: ${helpText}`" />
    </div>
    <span class="jmp-switch">
      <input
        :id="fieldId"
        class="jmp-switchInput"
        type="checkbox"
        role="switch"
        :aria-label="hideLabel ? label : undefined"
        :disabled="disabled"
        :checked="modelValue === true"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span class="jmp-switchTrack" aria-hidden="true"></span>
    </span>
  </div>
</template>

<style scoped>
.jmp-switchRow {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  min-height: 2.4rem;
}
.jmp-switchRow.is-labelHidden {
  min-height: 0;
}
.jmp-switchLabel {
  cursor: pointer;
}
.jmp-switch {
  display: inline-flex;
  flex: 0 0 auto;
  height: 1.25rem;
  position: relative;
  width: 2.25rem;
}
.jmp-switchInput {
  cursor: pointer;
  height: 100%;
  inset: 0;
  margin: 0;
  opacity: 0;
  position: absolute;
  width: 100%;
  z-index: 1;
}
.jmp-switchInput:disabled {
  cursor: default;
}
.jmp-switchTrack {
  background: var(--jmp-theme-action-focus);
  border-radius: 999px;
  inset: 0;
  position: absolute;
  transition: background 0.16s ease;
}
.jmp-switchTrack::after {
  background: var(--jmp-theme-text-primary);
  border-radius: 50%;
  content: '';
  height: 0.95rem;
  left: 0.15rem;
  position: absolute;
  top: 0.15rem;
  transition: transform 0.16s ease;
  width: 0.95rem;
}
.jmp-switchInput:checked + .jmp-switchTrack {
  background: var(--jmp-theme-primary);
}
.jmp-switchInput:checked + .jmp-switchTrack::after {
  background: var(--jmp-theme-primary-contrast);
  transform: translateX(1rem);
}
.jmp-switchInput:focus-visible + .jmp-switchTrack {
  outline: 2px solid var(--jmp-theme-primary);
  outline-offset: 2px;
}
.jmp-switchInput:disabled + .jmp-switchTrack {
  opacity: 0.4;
}
</style>
