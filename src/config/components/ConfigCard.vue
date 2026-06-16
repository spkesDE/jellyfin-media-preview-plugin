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
    <slot />
  </div>
</template>
