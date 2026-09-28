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

<style scoped>
.ec-helpTrigger {
  align-items: center;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 50%;
  color: inherit;
  cursor: help;
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 0.7rem;
  font-weight: 700;
  height: 1.05rem;
  justify-content: center;
  opacity: 0.68;
  outline: none;
  padding: 0;
  width: 1.05rem;
}

.ec-helpTrigger:hover,
.ec-helpTrigger:focus-visible {
  opacity: 1;
}

.ec-helpTrigger:focus-visible {
  box-shadow: 0 0 0 2px var(--jf-palette-secondary-main, var(--theme-primary-color, #00a4dc));
}

.ec-helpTooltip {
  background: var(--jf-palette-background-paper, #202020);
  border: 1px solid var(--jf-palette-divider, rgb(255 255 255 / 14%));
  border-radius: var(--jf-card-borderRadius, 0.25rem);
  box-sizing: border-box;
  box-shadow: 0 0.45rem 1.3rem rgba(0, 0, 0, 0.4);
  color: var(--jf-palette-text-primary, #fff);
  font-size: 0.82rem;
  font-weight: 400;
  line-height: 1.35;
  max-width: min(24rem, calc(100vw - 2rem));
  padding: 0.65rem 0.75rem;
  pointer-events: none;
  position: fixed;
  text-align: left;
  width: max-content;
  z-index: 9999;
}

.ec-helpTooltip::after {
  content: '';
  position: absolute;
}

.ec-helpTooltip.is-above::after {
  border-left: 0.35rem solid transparent;
  border-right: 0.35rem solid transparent;
  border-top: 0.35rem solid var(--jf-palette-background-paper, #202020);
  left: var(--ec-tooltip-arrow-left, 50%);
  top: 100%;
  transform: translateX(-50%);
}

.ec-helpTooltip.is-below::after {
  border-bottom: 0.35rem solid var(--jf-palette-background-paper, #202020);
  border-left: 0.35rem solid transparent;
  border-right: 0.35rem solid transparent;
  bottom: 100%;
  left: var(--ec-tooltip-arrow-left, 50%);
  transform: translateX(-50%);
}

.ec-helpTooltip.is-left::after {
  border-bottom: 0.35rem solid transparent;
  border-left: 0.35rem solid var(--jf-palette-background-paper, #202020);
  border-top: 0.35rem solid transparent;
  left: 100%;
  top: var(--ec-tooltip-arrow-top, 50%);
  transform: translateY(-50%);
}

.ec-helpTooltip.is-right::after {
  border-bottom: 0.35rem solid transparent;
  border-right: 0.35rem solid var(--jf-palette-background-paper, #202020);
  border-top: 0.35rem solid transparent;
  right: 100%;
  top: var(--ec-tooltip-arrow-top, 50%);
  transform: translateY(-50%);
}
</style>
