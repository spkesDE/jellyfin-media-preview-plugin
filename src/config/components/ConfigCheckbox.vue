<script setup lang="ts">
defineProps<{ label: string; modelValue?: unknown }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <div class="checkboxContainer">
    <label class="emby-checkbox-label">
      <input
        class="emby-checkbox"
        type="checkbox"
        :checked="modelValue === true"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      >
      <span class="checkboxLabel">{{ label }}</span>
      <span class="checkboxOutline">
        <span class="material-icons checkboxIcon checkboxIcon-checked check" aria-hidden="true"></span>
        <span class="material-icons checkboxIcon checkboxIcon-unchecked" aria-hidden="true"></span>
      </span>
    </label>
  </div>
</template>
