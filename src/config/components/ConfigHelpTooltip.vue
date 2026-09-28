<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue';

const props = defineProps<{
  text: string;
  label?: string;
}>();

const tooltipId = useId();
const trigger = ref<HTMLButtonElement>();
const tooltip = ref<HTMLElement>();
const open = ref(false);
type Placement = 'above' | 'below' | 'left' | 'right';

const placement = ref<Placement>('above');
const coordinates = ref({ arrowLeft: 0, arrowTop: 0, left: 0, top: 0 });

const tooltipStyle = computed(() => ({
  '--ec-tooltip-arrow-left': `${coordinates.value.arrowLeft}px`,
  '--ec-tooltip-arrow-top': `${coordinates.value.arrowTop}px`,
  left: `${coordinates.value.left}px`,
  top: `${coordinates.value.top}px`
}));

function updatePosition() {
  if (!open.value || !trigger.value || !tooltip.value) return;

  const triggerRect = trigger.value.getBoundingClientRect();
  const tooltipRect = tooltip.value.getBoundingClientRect();
  const viewportPadding = 8;
  const gap = 9;
  const spaces: Record<Placement, number> = {
    above: triggerRect.top - viewportPadding,
    below: window.innerHeight - triggerRect.bottom - viewportPadding,
    left: triggerRect.left - viewportPadding,
    right: window.innerWidth - triggerRect.right - viewportPadding
  };
  const requiredSpace: Record<Placement, number> = {
    above: tooltipRect.height + gap,
    below: tooltipRect.height + gap,
    left: tooltipRect.width + gap,
    right: tooltipRect.width + gap
  };
  const preferredPlacements: Placement[] = ['above', 'below', 'right', 'left'];
  const nextPlacement =
    preferredPlacements.find((candidate) => spaces[candidate] >= requiredSpace[candidate]) ??
    preferredPlacements.reduce((best, candidate) =>
      spaces[candidate] - requiredSpace[candidate] > spaces[best] - requiredSpace[best] ? candidate : best
    );

  let idealLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  let idealTop = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
  if (nextPlacement === 'above') idealTop = triggerRect.top - tooltipRect.height - gap;
  if (nextPlacement === 'below') idealTop = triggerRect.bottom + gap;
  if (nextPlacement === 'left') idealLeft = triggerRect.left - tooltipRect.width - gap;
  if (nextPlacement === 'right') idealLeft = triggerRect.right + gap;

  const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);
  const maxTop = Math.max(viewportPadding, window.innerHeight - tooltipRect.height - viewportPadding);
  const left = Math.min(Math.max(idealLeft, viewportPadding), maxLeft);
  const top = Math.min(Math.max(idealTop, viewportPadding), maxTop);
  const triggerCenterX = triggerRect.left + triggerRect.width / 2;
  const triggerCenterY = triggerRect.top + triggerRect.height / 2;

  placement.value = nextPlacement;
  coordinates.value = {
    arrowLeft: Math.min(Math.max(triggerCenterX - left, 12), tooltipRect.width - 12),
    arrowTop: Math.min(Math.max(triggerCenterY - top, 12), tooltipRect.height - 12),
    left,
    top
  };
}

function show() {
  if (open.value) return;
  open.value = true;
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', updatePosition, true);
  void nextTick(updatePosition);
}

function hide() {
  open.value = false;
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', updatePosition, true);
}

onBeforeUnmount(hide);
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="ec-helpTrigger"
    :aria-label="props.label || props.text"
    :aria-describedby="tooltipId"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
    @keydown.escape="hide"
  >
    <span aria-hidden="true">?</span>
  </button>
  <Teleport to="body">
    <span
      v-show="open"
      :id="tooltipId"
      ref="tooltip"
      class="ec-helpTooltip"
      :class="`is-${placement}`"
      :style="tooltipStyle"
      role="tooltip"
      >{{ props.text }}</span
    >
  </Teleport>
</template>
