<script setup lang="ts">
import { ref, useId } from 'vue';

defineProps<{
  label: string;
  modelValue?: unknown;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: number] }>();
const fieldId = useId();
const focused = ref(false);
</script>

<template>
  <div class="inputContainer">
    <label
      class="inputLabel"
      :class="focused ? 'inputLabelFocused' : 'inputLabelUnfocused'"
      :for="fieldId"
    >
      {{ label }}
    </label>
    <input
      :id="fieldId"
      class="emby-input"
      type="number"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :value="Number(modelValue ?? 0)"
      @focus="focused = true"
      @blur="focused = false"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    >
  </div>
</template>
