<script setup lang="ts">
import ConfigHelpTooltip from './ConfigHelpTooltip.vue';

/** A group inside a card: small uppercase heading, optional help, divider above every group but the first. */
defineProps<{ title: string; helpText?: string }>();
</script>

<template>
  <section class="jmp-configSection">
    <div class="jmp-configSectionTitle">
      <h4>{{ title }}</h4>
      <ConfigHelpTooltip v-if="helpText" :text="helpText" :label="`${title}: ${helpText}`" />
      <div v-if="$slots.actions" class="jmp-configSectionActions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.jmp-configSection {
  align-content: start;
  border-top: 1px solid var(--jmp-theme-divider);
  display: grid;
  gap: 0.6rem;
  padding: 0.9rem 0 0.2rem;
}
.jmp-configSection + .jmp-configSection {
  margin-top: 0.9rem;
}
/* No divider directly under the card title: the first group follows the heading. */
.jmp-configSection:first-of-type {
  border-top: 0;
  padding-top: 0;
}
.jmp-configSectionTitle {
  align-items: center;
  display: flex;
  gap: 0.4rem;
}
.jmp-configSectionActions {
  margin-left: auto;
}
.jmp-configSectionTitle h4 {
  color: var(--jmp-theme-text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  margin: 0;
  text-transform: uppercase;
}
.jmp-configSection > :deep(.inputContainer),
.jmp-configSection > :deep(.selectContainer),
.jmp-configSection > :deep(.checkboxContainer) {
  margin-bottom: 0;
}
.jmp-configSection > :deep(.jmp-note) {
  margin: -0.2rem 0 0;
}
</style>
