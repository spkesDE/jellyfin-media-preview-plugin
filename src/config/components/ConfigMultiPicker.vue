<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import ConfigHelpTooltip from './ConfigHelpTooltip.vue';
import type { SelectOption } from './ConfigSelect.vue';

const props = defineProps<{
  label: string;
  modelValue: string[];
  options: SelectOption[];
  emptyText?: string;
  helpText?: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLElement | null>(null);
const open = ref(false);
const query = ref('');
const placement = ref<'up' | 'down'>('down');
const menuStyle = ref<CSSProperties>({ visibility: 'hidden' });

const filteredOptions = computed(() => {
  const term = query.value.trim().toLocaleLowerCase();
  return term ? props.options.filter((option) => option.label.toLocaleLowerCase().includes(term)) : props.options;
});
const selectedLabels = computed(() =>
  props.modelValue
    .map((value) => props.options.find((option) => option.value === value)?.label)
    .filter((value): value is string => Boolean(value))
);
const selectionText = computed(() => {
  if (!selectedLabels.value.length) return 'Select options';
  if (selectedLabels.value.length <= 2) return selectedLabels.value.join(', ');
  return `${selectedLabels.value[0]} +${selectedLabels.value.length - 1}`;
});

function toggle(value: string): void {
  const enabled = !props.modelValue.includes(value);
  emit(
    'update:modelValue',
    enabled ? [...new Set([...props.modelValue, value])] : props.modelValue.filter((candidate) => candidate !== value)
  );
}

function close(): void {
  open.value = false;
  query.value = '';
  menuStyle.value = { visibility: 'hidden' };
}

function positionMenu(): void {
  if (!open.value || !trigger.value || !menu.value) return;
  const rect = trigger.value.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const margin = 8;
  const gap = 6;
  const width = Math.min(Math.max(rect.width, 352), Math.max(1, viewportWidth - margin * 2));
  const left = Math.min(Math.max(rect.left, margin), Math.max(margin, viewportWidth - margin - width));
  const naturalHeight = Math.min(menu.value.scrollHeight, 420);
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap - margin);
  const spaceAbove = Math.max(0, rect.top - gap - margin);
  const openUp = spaceBelow < Math.min(naturalHeight, 260) && spaceAbove > spaceBelow;
  const availableHeight = openUp ? spaceAbove : spaceBelow;
  const maxHeight = Math.max(80, availableHeight);
  const renderedHeight = Math.min(naturalHeight, maxHeight);
  placement.value = openUp ? 'up' : 'down';
  menuStyle.value = {
    left: `${left}px`,
    maxHeight: `${maxHeight}px`,
    position: 'fixed',
    top: `${openUp ? Math.max(margin, rect.top - gap - renderedHeight) : rect.bottom + gap}px`,
    visibility: 'visible',
    width: `${width}px`,
    zIndex: 10000
  };
}

function toggleOpen(): void {
  if (open.value) {
    close();
    return;
  }
  open.value = true;
  void nextTick(positionMenu);
}

function handleOutsideClick(event: PointerEvent): void {
  const target = event.target as Node;
  if (open.value && root.value && !root.value.contains(target) && !menu.value?.contains(target)) close();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

function handleViewportChange(): void {
  if (open.value) positionMenu();
}

watch(
  () => [query.value, props.options.length],
  () => {
    if (open.value) void nextTick(positionMenu);
  }
);

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('scroll', handleViewportChange, true);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick);
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleViewportChange);
  window.removeEventListener('scroll', handleViewportChange, true);
});
</script>

<template>
  <div ref="root" class="jmp-multiPicker" :class="{ 'is-open': open }">
    <div class="jmp-multiPickerLabelRow">
      <label class="selectLabel">{{ label }}</label>
      <ConfigHelpTooltip v-if="helpText" :text="helpText" :label="`${label}: ${helpText}`" />
    </div>
    <button
      ref="trigger"
      type="button"
      class="emby-select emby-select-withcolor jmp-multiPickerTrigger"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggleOpen"
    >
      <span :class="{ 'is-placeholder': !selectedLabels.length }">{{ selectionText }}</span>
      <span class="material-icons" aria-hidden="true">{{
        placement === 'up' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'
      }}</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menu"
        class="jmp-multiPickerMenu"
        :class="`opens-${placement}`"
        :style="menuStyle"
        role="listbox"
        aria-multiselectable="true"
      >
        <div class="jmp-multiPickerSearchWrap">
          <span class="material-icons" aria-hidden="true">search</span>
          <input v-model="query" class="jmp-multiPickerSearch" type="search" placeholder="Search" autofocus />
        </div>
        <div v-if="filteredOptions.length" class="jmp-multiPickerOptions">
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            class="jmp-multiPickerOption"
            :class="{ 'is-selected': modelValue.includes(option.value) }"
            role="option"
            :aria-selected="modelValue.includes(option.value)"
            @click="toggle(option.value)"
          >
            <span class="material-icons jmp-multiPickerCheck" aria-hidden="true">
              {{ modelValue.includes(option.value) ? 'check_box' : 'check_box_outline_blank' }}
            </span>
            <span>{{ option.label }}</span>
          </button>
        </div>
        <p v-else class="jmp-multiPickerEmpty">{{ emptyText || 'No options' }}</p>
        <footer class="jmp-multiPickerFooter">
          <span>{{ modelValue.length }} selected</span>
          <div>
            <button
              v-if="modelValue.length"
              type="button"
              class="jmp-multiPickerFooterButton"
              @click="emit('update:modelValue', [])"
            >
              Clear
            </button>
            <button type="button" class="jmp-multiPickerFooterButton is-primary" @click="close">Done</button>
          </div>
        </footer>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.jmp-multiPicker {
  margin-bottom: 1rem;
  min-width: 0;
  position: relative;
}
.jmp-multiPickerLabelRow {
  align-items: center;
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
  width: fit-content;
}
.jmp-multiPickerLabelRow > .selectLabel {
  display: block;
}
.jmp-multiPickerTrigger {
  align-items: center;
  background: var(--jf-palette-FilledInput-bg, rgb(255 255 255 / 8%));
  border: 1px solid var(--jf-palette-FilledInput-borderColor, rgb(255 255 255 / 18%));
  border-radius: var(--jf-card-borderRadius, 0.25rem);
  color: inherit;
  cursor: pointer;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  min-height: 2.7rem;
  padding: 0.6rem 0.75rem;
  text-align: left;
  width: 100%;
}
.jmp-multiPickerTrigger:focus-visible,
.jmp-multiPicker.is-open .jmp-multiPickerTrigger {
  border-color: var(--jf-palette-secondary-main, var(--theme-primary-color, #00a4dc));
  outline: 1px solid var(--jf-palette-secondary-main, var(--theme-primary-color, #00a4dc));
}
.jmp-multiPickerTrigger .is-placeholder {
  opacity: 0.58;
}
.jmp-multiPickerMenu {
  background: var(--jf-palette-background-paper, #202020);
  border: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 14%));
  border-radius: var(--jf-card-borderRadius, 0.25rem);
  box-shadow: 0 0.85rem 2.4rem rgba(0, 0, 0, 0.55);
  color: var(--jf-palette-text-primary, #fff);
  display: flex;
  flex-direction: column;
  min-width: min(22rem, calc(100vw - 1rem));
  overflow: hidden;
  overscroll-behavior: contain;
}
.jmp-multiPickerSearchWrap {
  align-items: center;
  border-bottom: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 14%));
  display: flex;
  flex: 0 0 auto;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
}
.jmp-multiPickerSearchWrap .material-icons {
  font-size: 1.2rem;
  opacity: 0.55;
}
.jmp-multiPickerSearch {
  background: transparent;
  border: 0;
  color: inherit;
  min-width: 0;
  outline: 0;
  padding: 0.25rem 0;
  width: 100%;
}
.jmp-multiPickerOptions {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0.35rem;
}
.jmp-multiPickerOption {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0.3rem;
  color: inherit;
  cursor: pointer;
  display: flex;
  gap: 0.55rem;
  padding: 0.55rem 0.6rem;
  text-align: left;
  width: 100%;
}
.jmp-multiPickerOption:hover,
.jmp-multiPickerOption:focus-visible {
  background: rgb(255 255 255 / 8%);
  outline: 0;
}
.jmp-multiPickerOption.is-selected {
  background: rgb(255 255 255 / 12%);
}
.jmp-multiPickerCheck {
  color: var(--jf-palette-primary-main, var(--theme-primary-color, #00a4dc));
  font-size: 1.25rem;
}
.jmp-multiPickerEmpty {
  margin: 0;
  opacity: 0.68;
  padding: 1.1rem 0.9rem;
}
.jmp-multiPickerFooter {
  align-items: center;
  border-top: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 14%));
  display: flex;
  flex: 0 0 auto;
  font-size: 0.78rem;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.55rem 0.7rem;
}
.jmp-multiPickerFooter > div {
  display: flex;
  gap: 0.35rem;
}
.jmp-multiPickerFooterButton {
  background: transparent;
  border: 0;
  border-radius: 0.25rem;
  color: inherit;
  cursor: pointer;
  padding: 0.4rem 0.55rem;
}
.jmp-multiPickerFooterButton:hover {
  background: rgb(255 255 255 / 8%);
}
.jmp-multiPickerFooterButton.is-primary {
  color: var(--jf-palette-primary-main, var(--theme-primary-color, #00a4dc));
  font-weight: 700;
}
</style>
