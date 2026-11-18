<script setup lang="ts">
defineProps<{
  title?: string;
  help?: string;
  badge?: string;
  badgeTone?: 'default' | 'muted' | 'wip';
  plain?: boolean;
}>();
</script>

<template>
  <div class="jmp-subsection" :class="{ 'jmp-section-plain': plain }">
    <div v-if="title || help" class="jmp-cardHeader" :class="{ 'jmp-cardHeader-actions': $slots.actions }">
      <div class="jmp-cardHeaderCopy">
        <div v-if="title" :class="{ 'jmp-titleRow': badge }">
          <p class="jmp-subsectionTitle">{{ title }}</p>
          <span
            v-if="badge"
            class="jmp-badge"
            :class="{
              'jmp-badge-muted': badgeTone === 'muted',
              'jmp-badge-wip': badgeTone === 'wip'
            }"
          >
            {{ badge }}
          </span>
        </div>
        <p v-if="help" class="jmp-subsectionHelp">{{ help }}</p>
      </div>
      <div v-if="$slots.actions" class="jmp-cardActions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.jmp-cardActions {
  flex: 0 0 auto;
}
@media (max-width: 600px) {
  .jmp-cardActions {
    width: 100%;
  }
}
</style>
