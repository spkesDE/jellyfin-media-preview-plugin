<script setup lang="ts">
import { ref, useId } from 'vue';
import ConfigHelpTooltip from './ConfigHelpTooltip.vue';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

defineProps<{
  label: string;
  helpText?: string;
  modelValue?: unknown;
  options: SelectOption[];
  disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const fieldId = useId();
const focused = ref(false);
</script>

<template>
  <div class="selectContainer">
    <div class="ec-selectLabelRow ec-configLabelRow">
      <label class="selectLabel" :class="{ selectLabelFocused: focused }" :for="fieldId">
        {{ label }}
      </label>
      <ConfigHelpTooltip v-if="helpText" :text="helpText" :label="`${label}: ${helpText}`" />
    </div>
    <select
      :id="fieldId"
      class="emby-select emby-select-withcolor"
      :value="String(modelValue ?? '')"
      :disabled="disabled"
      @focus="focused = true"
      @blur="focused = false"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>
    <div class="selectArrowContainer" aria-hidden="true">
      <div style="visibility: hidden; display: none">0</div>
      <span class="selectArrow material-icons keyboard_arrow_down"></span>
    </div>
  </div>
</template>
