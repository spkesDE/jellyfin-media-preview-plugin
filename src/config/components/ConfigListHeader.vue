<script setup lang="ts">
import ConfigHelpTooltip from './ConfigHelpTooltip.vue';

/** Title row above a list of panels: name, one-line status, and the list's actions on the right. */
defineProps<{ title: string; helpText?: string; summary?: string }>();
</script>

<template>
  <header class="jmp-listHeader">
    <div class="jmp-listHeaderCopy">
      <div class="jmp-listHeaderTitle ec-configLabelRow">
        <h3>{{ title }}</h3>
        <ConfigHelpTooltip v-if="helpText" :text="helpText" :label="`${title}: ${helpText}`" />
      </div>
      <p v-if="summary" class="jmp-listHeaderSummary">{{ summary }}</p>
    </div>
    <div v-if="$slots.actions" class="jmp-listHeaderActions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.jmp-listHeader {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  justify-content: space-between;
  margin: 0 0 0.75rem;
}
.jmp-listHeaderCopy {
  min-width: 0;
}
.jmp-listHeaderTitle {
  align-items: center;
  display: flex;
  gap: 0.4rem;
}
.jmp-listHeaderTitle h3 {
  font-size: 1.15rem;
  margin: 0;
}
.jmp-listHeaderSummary {
  font-size: 0.85rem;
  margin: 0.15rem 0 0;
  opacity: 0.65;
}
.jmp-listHeaderActions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .jmp-listHeaderActions {
    width: 100%;
  }
  .jmp-listHeaderActions > * {
    flex: 1 1 auto;
  }
}
</style>
