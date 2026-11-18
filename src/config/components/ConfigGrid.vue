<script setup lang="ts">
withDefaults(defineProps<{ columns?: 2 | 3 | 4 }>(), { columns: 2 });
</script>

<template>
  <div class="jmp-configGrid" :class="`jmp-configGrid-${columns}`">
    <slot />
  </div>
</template>

<style scoped>
.jmp-configGrid {
  align-items: end;
  display: grid;
  gap: 0.75rem 1rem;
}
.jmp-configGrid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.jmp-configGrid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.jmp-configGrid-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.jmp-configGrid > :deep(.inputContainer),
.jmp-configGrid > :deep(.selectContainer),
.jmp-configGrid > :deep(.checkboxContainer),
.jmp-configGrid > :deep(.jmp-multiPicker) {
  margin-bottom: 0;
}

@media (max-width: 900px) {
  .jmp-configGrid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .jmp-configGrid-2,
  .jmp-configGrid-3,
  .jmp-configGrid-4 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
