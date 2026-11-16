<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue';

export interface ConfigMenuAction {
  id: string;
  label: string;
  icon: string;
  description?: string;
  /** Consecutive actions with the same group share a heading. */
  group?: string;
  disabled?: boolean;
  danger?: boolean;
}

const props = defineProps<{
  label: string;
  actions: ConfigMenuAction[];
  /** Renders a primary text button instead of the overflow icon. */
  triggerText?: string;
  triggerIcon?: string;
}>();
const emit = defineEmits<{ select: [id: string] }>();
const menuId = useId();
const root = ref<HTMLElement | null>(null);
const open = ref(false);

const entries = computed(() =>
  props.actions.map((action, index) => ({
    action,
    heading: action.group && action.group !== props.actions[index - 1]?.group ? action.group : null
  }))
);

function close(): void {
  open.value = false;
  document.removeEventListener('pointerdown', onOutsidePointer, true);
}

function onOutsidePointer(event: PointerEvent): void {
  if (!root.value?.contains(event.target as Node)) close();
}

async function toggle(): Promise<void> {
  if (open.value) {
    close();
    return;
  }
  open.value = true;
  document.addEventListener('pointerdown', onOutsidePointer, true);
  await nextTick();
  root.value?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
}

function choose(action: ConfigMenuAction): void {
  if (action.disabled) return;
  close();
  emit('select', action.id);
}

onBeforeUnmount(close);
</script>

<template>
  <div ref="root" class="jmp-actionMenu" @keydown.esc.stop="close">
    <button
      v-if="triggerText"
      type="button"
      class="raised button-submit emby-button jmp-actionMenuTrigger"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="menuId"
      @click="toggle"
    >
      <span v-if="triggerIcon" class="material-icons" aria-hidden="true">{{ triggerIcon }}</span>
      {{ triggerText }}
      <span class="material-icons" aria-hidden="true">expand_more</span>
    </button>
    <button
      v-else
      type="button"
      class="paper-icon-button-light jmp-ruleIconButton"
      :title="label"
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="menuId"
      @click="toggle"
    >
      <span class="material-icons" aria-hidden="true">{{ triggerIcon ?? 'more_vert' }}</span>
    </button>
    <div
      v-if="open"
      :id="menuId"
      class="jmp-actionMenuList"
      :class="{ 'has-descriptions': actions.some((action) => action.description) }"
      role="menu"
      :aria-label="label"
    >
      <template v-for="{ action, heading } in entries" :key="action.id">
        <p v-if="heading" class="jmp-actionMenuHeading" role="presentation">{{ heading }}</p>
        <button
          type="button"
          role="menuitem"
          class="jmp-actionMenuItem"
          :class="{ 'is-danger': action.danger }"
          :disabled="action.disabled"
          @click="choose(action)"
        >
          <span class="material-icons" aria-hidden="true">{{ action.icon }}</span>
          <span class="jmp-actionMenuText">
            <span>{{ action.label }}</span>
            <span v-if="action.description" class="jmp-actionMenuDescription">{{ action.description }}</span>
          </span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.jmp-actionMenu {
  position: relative;
}
.jmp-actionMenuTrigger {
  align-items: center;
  background: var(--jmp-theme-primary);
  border: 0;
  border-radius: var(--jmp-theme-radius, 0.5rem);
  color: var(--jmp-theme-primary-contrast);
  cursor: pointer;
  display: inline-flex;
  gap: 0.4rem;
  justify-content: center;
  margin: 0;
  min-height: 2.35rem;
  padding: 0.45rem 0.6rem 0.45rem 0.75rem;
  white-space: nowrap;
}
.jmp-actionMenuTrigger:hover {
  background: var(--jmp-theme-primary-dark);
}
.jmp-actionMenuList {
  background: var(--jmp-theme-paper);
  border: 1px solid var(--jmp-theme-divider);
  border-radius: var(--jmp-theme-radius, 0.5rem);
  box-shadow: 0 0.6rem 1.6rem rgba(0, 0, 0, 0.35);
  display: grid;
  max-height: min(30rem, 70vh);
  min-width: 12rem;
  overflow-y: auto;
  padding: 0.3rem;
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  z-index: 20;
}
.jmp-actionMenuList.has-descriptions {
  width: min(22rem, calc(100vw - 2rem));
}
.jmp-actionMenuHeading {
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  margin: 0;
  opacity: 0.55;
  padding: 0.6rem 0.6rem 0.25rem;
  text-transform: uppercase;
}
.jmp-actionMenuItem {
  align-items: flex-start;
  background: transparent;
  border: 0;
  border-radius: calc(var(--jmp-theme-radius, 0.5rem) - 0.15rem);
  color: inherit;
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  text-align: left;
}
.jmp-actionMenuItem .material-icons {
  font-size: 1.15rem;
  opacity: 0.8;
}
.jmp-actionMenuText {
  display: grid;
  gap: 0.1rem;
}
.jmp-actionMenuDescription {
  font-size: 0.8rem;
  opacity: 0.65;
}
.jmp-actionMenuItem:hover:not(:disabled),
.jmp-actionMenuItem:focus-visible {
  background: var(--jmp-theme-action-hover);
  outline: none;
}
.jmp-actionMenuItem:disabled {
  cursor: default;
  opacity: 0.35;
}
.jmp-actionMenuItem.is-danger {
  color: var(--jmp-theme-error-light);
}
</style>
