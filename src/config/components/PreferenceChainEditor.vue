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
        <svg class="jmp-preferenceLock" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M12 2a5 5 0 0 0-5 5v3H5v12h14V10h-2V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z" />
        </svg>
        <span class="jmp-preferenceLabel">{{ sourceLabels[props.primary] }} (Fixed on Top)</span>
        <span class="jmp-preferenceState">Always enabled</span>
      </li>
    </ol>
    <Draggable
      v-model="model"
      tag="ol"
      class="jmp-preferenceList jmp-preferenceFallbacks"
      item-key="Source"
      handle=".jmp-dragHandle"
      ghost-class="is-dragging"
      :animation="180"
    >
      <template #item="{ element, index }: { element: ConfigPreviewFallbackSource; index: number }">
        <li class="jmp-preferenceItem">
          <button class="jmp-dragHandle" type="button" title="Drag to reorder" aria-label="Drag to reorder">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path
                d="M11 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"
              />
            </svg>
          </button>
          <label class="jmp-preferenceToggle">
            <input v-model="element.Enabled" class="emby-checkbox" type="checkbox" />
            <span class="checkboxLabel">{{ sourceLabels[element.Source] }}</span>
            <span class="checkboxOutline">
              <span class="material-icons checkboxIcon checkboxIcon-checked check" aria-hidden="true"></span>
              <span class="material-icons checkboxIcon checkboxIcon-unchecked" aria-hidden="true"></span>
            </span>
          </label>
          <div class="jmp-preferenceMoveButtons">
            <button
              type="button"
              class="paper-icon-button-light"
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
              class="paper-icon-button-light"
              :disabled="index === model.length - 1"
              :aria-label="`Move ${sourceLabels[element.Source]} down`"
              @click="move(index, 1)"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="m7.4 9.4 4.6 4.6 4.6-4.6L18 10.8l-6 6-6-6 1.4-1.4z" />
              </svg>
            </button>
          </div>
        </li>
      </template>
    </Draggable>
  </section>
</template>
