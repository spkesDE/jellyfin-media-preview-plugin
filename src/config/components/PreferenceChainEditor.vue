<script setup lang="ts">
import Draggable from 'vuedraggable';
import type { PreviewChainSource } from '../../types/config';
import type { ConfigPreviewFallbackSource } from '../libs/types';

const props = defineProps<{
  title: string;
  primary: PreviewChainSource;
}>();
const model = defineModel<ConfigPreviewFallbackSource[]>({ required: true });

const sourceLabels: Record<PreviewChainSource, string> = {
  trickplay: 'Trickplay',
  'local-trailer': 'Local Trailer',
  'remote-trailer': 'Remote / YouTube Trailer',
  'direct-play': 'Direct Play'
};

function move(index: number, offset: number): void {
  const target = index + offset;
  if (target < 0 || target >= model.value.length) {
    return;
  }
  const next = [...model.value];
  const [entry] = next.splice(index, 1);
  next.splice(target, 0, entry);
  model.value = next;
}
</script>

<template>
  <section class="jmp-preferenceEditor" :aria-label="title">
    <p class="jmp-preferenceTitle">{{ title }}</p>
    <ol class="jmp-preferenceList">
      <li class="jmp-preferenceItem is-fixed">
        <span class="jmp-preferenceFixedHandle" aria-hidden="true">
          <svg class="jmp-preferenceLock" viewBox="0 0 24 24" focusable="false">
            <path d="M12 2a5 5 0 0 0-5 5v3H5v12h14V10h-2V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z" />
          </svg>
        </span>
        <span class="jmp-preferenceLabel">{{ sourceLabels[props.primary] }}</span>
        <span class="jmp-preferenceState">Fixed · always on</span>
      </li>
    </ol>
    <Draggable
      v-model="model"
      tag="ol"
      class="jmp-preferenceList jmp-preferenceFallbacks"
      item-key="Source"
      handle=".jmp-dragHandle"
      ghost-class="jmp-preferenceDragGhost"
      chosen-class="jmp-preferenceDragChosen"
      drag-class="jmp-preferenceDragging"
      fallback-class="jmp-preferenceDragPreview"
      :force-fallback="true"
      :fallback-on-body="true"
      :fallback-tolerance="3"
      :animation="160"
    >
      <template #item="{ element, index }: { element: ConfigPreviewFallbackSource; index: number }">
        <li class="jmp-preferenceItem" :class="{ 'is-disabled': !element.Enabled }">
          <button class="jmp-dragHandle" type="button" title="Drag to reorder" aria-label="Drag to reorder">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path
                d="M11 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
              />
            </svg>
          </button>
          <span class="jmp-preferenceLabel">{{ sourceLabels[element.Source] }}</span>
          <div class="jmp-preferenceActions">
            <label class="jmp-preferenceSwitch" :title="element.Enabled ? 'Disable fallback' : 'Enable fallback'">
              <input
                v-model="element.Enabled"
                type="checkbox"
                :aria-label="`${element.Enabled ? 'Disable' : 'Enable'} ${sourceLabels[element.Source]}`"
              />
              <span class="jmp-preferenceSwitchTrack" aria-hidden="true"></span>
            </label>
            <div class="jmp-preferenceMoveButtons">
              <button
                type="button"
                class="jmp-preferenceMoveButton"
                :disabled="index === 0"
                :aria-label="`Move ${sourceLabels[element.Source]} up`"
                @click="move(index, -1)"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  <path d="m7.4 14.6 4.6-4.6 4.6 4.6L18 13.2l-6-6-6 6 1.4 1.4z" />
                </svg>
              </button>
              <button
                type="button"
                class="jmp-preferenceMoveButton"
                :disabled="index === model.length - 1"
                :aria-label="`Move ${sourceLabels[element.Source]} down`"
                @click="move(index, 1)"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  <path d="m7.4 9.4 4.6 4.6 4.6-4.6L18 10.8l-6 6-6-6 1.4-1.4z" />
                </svg>
              </button>
            </div>
          </div>
        </li>
      </template>
    </Draggable>
  </section>
</template>

<style scoped>
.jmp-preferenceEditor {
  min-width: 0;
  padding: 0 1rem;
}

.jmp-preferenceEditor:first-child {
  padding-left: 0;
}

.jmp-preferenceEditor:last-child {
  padding-right: 0;
}

.jmp-preferenceEditor:not(:last-child) {
  border-right: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 10%));
}

.jmp-preferenceTitle {
  margin: 0 0 0.45rem;
  color: var(--jf-palette-text-primary, #fff);
  font-weight: 600;
}

.jmp-preferenceList {
  margin: 0;
  padding: 0;
  list-style: none;
}

.jmp-preferenceItem {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  min-height: 3rem;
  padding: 0.2rem 0.45rem;
  border-bottom: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 9%));
  transition:
    background-color 0.16s ease,
    opacity 0.16s ease;
}

.jmp-preferenceItem.is-fixed {
  min-height: 2.7rem;
  border-top: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 9%));
}

.jmp-preferenceItem.is-disabled .jmp-preferenceLabel {
  opacity: 0.42;
}

:global(.jmp-preferenceDragGhost),
:global(.jmp-preferenceDragChosen:not(.jmp-preferenceDragPreview)) {
  opacity: 0 !important;
}

:global(.jmp-preferenceDragPreview) {
  border: 1px solid var(--jf-palette-primary-main, var(--theme-primary-color, #00a4dc));
  border-radius: 0.35rem;
  background: var(--jf-palette-background-paper, #202020);
  box-shadow: 0 0.8rem 2rem rgb(0 0 0 / 45%);
  opacity: 0.96;
  pointer-events: none;
}

:global(.jmp-preferenceDragging) {
  cursor: grabbing;
}

.jmp-preferenceFixedHandle,
.jmp-dragHandle {
  margin-right: 0.4rem;
  color: var(--jf-palette-text-secondary, rgb(255 255 255 / 70%));
}

.jmp-preferenceFixedHandle,
.jmp-dragHandle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
}

.jmp-preferenceLock,
.jmp-dragHandle svg,
.jmp-preferenceMoveButtons svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}

.jmp-dragHandle {
  padding: 0.35rem;
  border: 0;
  background: transparent;
  opacity: 0.58;
  cursor: grab;
}

.jmp-dragHandle:hover,
.jmp-dragHandle:focus-visible {
  opacity: 1;
}

.jmp-dragHandle:active {
  cursor: grabbing;
}

.jmp-preferenceLabel {
  min-width: 0;
  color: var(--jf-palette-text-primary, #fff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jmp-preferenceActions,
.jmp-preferenceMoveButtons {
  display: flex;
  align-items: center;
}

.jmp-preferenceState {
  color: var(--jf-palette-text-secondary, rgb(255 255 255 / 70%));
  font-size: 0.72rem;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.jmp-preferenceSwitch {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-inline: 0.25rem 0.35rem;
  cursor: pointer;
}

.jmp-preferenceSwitch input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.jmp-preferenceSwitchTrack {
  position: relative;
  display: block;
  width: 2rem;
  height: 1.1rem;
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 999px;
  background: rgb(255 255 255 / 12%);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.jmp-preferenceSwitchTrack::after {
  position: absolute;
  top: 0.13rem;
  left: 0.14rem;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  background: rgb(255 255 255 / 82%);
  content: '';
  transition: transform 0.15s ease;
}

.jmp-preferenceSwitch input:checked + .jmp-preferenceSwitchTrack {
  border-color: var(--jf-palette-primary-main, var(--theme-primary-color, #00a4dc));
  background: var(--jf-palette-primary-main, var(--theme-primary-color, #00a4dc));
}

.jmp-preferenceSwitch input:checked + .jmp-preferenceSwitchTrack::after {
  transform: translateX(0.86rem);
}

.jmp-preferenceSwitch input:focus-visible + .jmp-preferenceSwitchTrack,
.jmp-preferenceMoveButton:focus-visible,
.jmp-dragHandle:focus-visible {
  outline: 2px solid var(--jf-palette-primary-main, var(--theme-primary-color, #00a4dc));
  outline-offset: 2px;
}

.jmp-preferenceMoveButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  padding: 0.25rem;
  border: 0;
  border-radius: 50%;
  color: var(--jf-palette-text-secondary, rgb(255 255 255 / 68%));
  background: transparent;
  opacity: 0.62;
  cursor: pointer;
}

.jmp-preferenceMoveButton:hover,
.jmp-preferenceMoveButton:focus-visible {
  color: var(--jf-palette-text-primary, #fff);
  background: rgb(255 255 255 / 8%);
  opacity: 1;
}

.jmp-preferenceMoveButton:disabled {
  opacity: 0.18;
  cursor: default;
}

@media (max-width: 1100px) {
  .jmp-preferenceEditor,
  .jmp-preferenceEditor:first-child,
  .jmp-preferenceEditor:last-child {
    padding: 0 0 1rem;
  }

  .jmp-preferenceEditor:not(:last-child) {
    margin-bottom: 1rem;
    border-right: 0;
    border-bottom: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 10%));
  }
}
</style>
