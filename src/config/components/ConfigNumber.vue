<script setup lang="ts">
import { ref, useId } from 'vue';
import ConfigHelpTooltip from './ConfigHelpTooltip.vue';

defineProps<{
  label: string;
  helpText?: string;
  modelValue?: unknown;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** Shown inside the field while the value is 0, for settings where 0 means "off" or "unlimited". */
  zeroLabel?: string;
  /** Keeps the label for assistive technology only, for rows that show column headings instead. */
  hideLabel?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
const fieldId = useId();
const focused = ref(false);
</script>

<template>
  <div class="inputContainer">
    <div v-if="!hideLabel" class="jmp-numberLabelRow">
      <label class="inputLabel" :class="focused ? 'inputLabelFocused' : 'inputLabelUnfocused'" :for="fieldId">
        {{ label }}
      </label>
      <ConfigHelpTooltip v-if="helpText" :text="helpText" :label="`${label}: ${helpText}`" />
    </div>
    <div class="jmp-numberField">
      <input
        :id="fieldId"
        class="emby-input"
        type="number"
        :aria-label="hideLabel ? label : undefined"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :value="Number(modelValue ?? 0)"
        @focus="focused = true"
        @blur="focused = false"
        @keydown.stop
        @keypress.stop
        @keyup.stop
        @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      />
      <span v-if="zeroLabel && Number(modelValue ?? 0) === 0" class="jmp-numberZeroLabel" aria-hidden="true">
        {{ zeroLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.jmp-numberField {
  position: relative;
}
.jmp-numberZeroLabel {
  color: var(--jmp-theme-text-secondary);
  opacity: 0.7;
  pointer-events: none;
  position: absolute;
  right: 2.2rem;
  top: 50%;
  transform: translateY(-50%);
}
.jmp-numberLabelRow {
  align-items: center;
  display: flex;
  gap: 0.4rem;
  width: fit-content;
}
</style>
