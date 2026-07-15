import { config } from '../config';
import type { CardState } from '../types/state';
import { getCardLayoutKind } from './layout';

const MANAGED_CLASS = 'jmp-wide-preview-card';
const EXPANDED_CLASS = 'jmp-wide-preview-expanded';
const SCROLLER_SHIFT_CLASS = 'jmp-wide-preview-scroller-shift';
const EXPANSION_DURATION_MS = 280;
const VIEWPORT_GUTTER_PX = 12;
const activeWidePreviewStates = new Set<CardState>();
let viewportResizeFrame: number | null = null;
let viewportResizeBound = false;

export interface WidePreviewDimensions {
  width: number;
  height: number;
}

function clearCleanupTimer(state: CardState): void {
  if (state.widePreviewCleanupTimer !== null) {
    window.clearTimeout(state.widePreviewCleanupTimer);
    state.widePreviewCleanupTimer = null;
  }
}

function restoreScrollerShift(state: CardState, immediate = false): void {
  if (!state.widePreviewScroller || state.widePreviewScrollerTranslate === null) {
    return;
  }

  state.widePreviewScroller.style.translate = state.widePreviewScrollerTranslate;
  if (immediate) {
    state.widePreviewScroller.classList.remove(SCROLLER_SHIFT_CLASS);
    state.widePreviewScroller.style.removeProperty('--jmp-wide-preview-duration');
    state.widePreviewScroller = null;
    state.widePreviewScrollerTranslate = null;
  }
}

function cleanupManagedCard(state: CardState): void {
  const card = state.widePreviewCard;
  if (!card) {
    return;
  }

  card.classList.remove(MANAGED_CLASS, EXPANDED_CLASS);
  card.style.removeProperty('--jmp-wide-preview-card-width');
  card.style.removeProperty('--jmp-wide-preview-media-height');
  card.style.removeProperty('--jmp-wide-preview-duration');
  restoreScrollerShift(state, true);
  state.widePreviewCard = null;
  activeWidePreviewStates.delete(state);
  if (!activeWidePreviewStates.size && viewportResizeBound) {
    window.removeEventListener('resize', handleViewportResize);
    viewportResizeBound = false;
  }
}

function handleViewportResize(): void {
  if (viewportResizeFrame !== null) {
    return;
  }

  viewportResizeFrame = window.requestAnimationFrame(() => {
    viewportResizeFrame = null;
    Array.from(activeWidePreviewStates).forEach((state) => {
      restorePortraitCardWidth(state, true);
    });
  });
}

function bindViewportResize(): void {
  if (viewportResizeBound) {
    return;
  }

  window.addEventListener('resize', handleViewportResize, { passive: true });
  viewportResizeBound = true;
}

export function expandPortraitCardForPreview(
  card: HTMLElement,
  state: CardState
): WidePreviewDimensions | null {
  if (config.portraitCardExpansionMode === 'off' || getCardLayoutKind(card) !== 'portrait' || !state.rootHost) {
    return null;
  }

  clearCleanupTimer(state);

  if (state.widePreviewCard === card && card.classList.contains(EXPANDED_CLASS)) {
    const configuredWidth = Number.parseFloat(card.style.getPropertyValue('--jmp-wide-preview-card-width'));
    const hostHeight = Number.parseFloat(card.style.getPropertyValue('--jmp-wide-preview-media-height'));
    const width = state.rootHost.offsetWidth + Math.max(0, configuredWidth - card.offsetWidth);
    return Number.isFinite(width) && Number.isFinite(hostHeight)
      ? { width, height: hostHeight }
      : null;
  }

  restoreScrollerShift(state, true);

  const scalable = state.rootHost.closest('.cardScalable');
  const cardWidth = card.offsetWidth;
  const hostWidth = state.rootHost.offsetWidth;
  const hostHeight = scalable instanceof HTMLElement
    ? scalable.offsetHeight
    : state.rootHost.offsetHeight;
  if (!cardWidth || !hostWidth || !hostHeight) {
    return null;
  }

  const aspectRatio = config.portraitCardExpansionMode === '16:9' ? 16 / 9 : 3 / 2;
  const desiredHostWidth = hostHeight * aspectRatio;
  const unclampedCardWidth = cardWidth + Math.max(0, desiredHostWidth - hostWidth);
  const layoutWidth = card.parentElement?.clientWidth || window.innerWidth;
  const cardRect = card.getBoundingClientRect();
  const maximumCardWidth = Math.max(cardWidth, Math.min(layoutWidth, window.innerWidth) * 0.72);
  const targetCardWidth = Math.min(unclampedCardWidth, maximumCardWidth);
  const targetHostWidth = hostWidth + Math.max(0, targetCardWidth - cardWidth);
  const overflowRight = Math.max(
    0,
    cardRect.left + targetCardWidth - (window.innerWidth - VIEWPORT_GUTTER_PX)
  );
  const maximumLeftShift = Math.max(0, cardRect.left - VIEWPORT_GUTTER_PX);
  const leftShift = Math.min(overflowRight, maximumLeftShift);

  if (targetCardWidth <= cardWidth + 1) {
    return null;
  }

  state.widePreviewCard = card;
  activeWidePreviewStates.add(state);
  bindViewportResize();
  const scroller = card.parentElement;
  if (leftShift > 0 && scroller instanceof HTMLElement) {
    state.widePreviewScroller = scroller;
    state.widePreviewScrollerTranslate = scroller.style.translate;
    scroller.style.setProperty('--jmp-wide-preview-duration', `${EXPANSION_DURATION_MS}ms`);
    scroller.classList.add(SCROLLER_SHIFT_CLASS);
    void scroller.offsetWidth;
    scroller.style.translate = `${-leftShift}px 0`;
  }
  card.style.setProperty('--jmp-wide-preview-card-width', `${targetCardWidth}px`);
  card.style.setProperty('--jmp-wide-preview-media-height', `${hostHeight}px`);
  card.style.setProperty('--jmp-wide-preview-duration', `${EXPANSION_DURATION_MS}ms`);
  card.classList.add(MANAGED_CLASS);
  void card.offsetWidth;
  card.classList.add(EXPANDED_CLASS);

  return { width: targetHostWidth, height: hostHeight };
}

export function restorePortraitCardWidth(state: CardState | null | undefined, immediate = false): void {
  if (!state?.widePreviewCard) {
    return;
  }

  clearCleanupTimer(state);
  state.widePreviewCard.classList.remove(EXPANDED_CLASS);
  restoreScrollerShift(state, immediate);

  if (immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    cleanupManagedCard(state);
    return;
  }

  state.widePreviewCleanupTimer = window.setTimeout(() => {
    cleanupManagedCard(state);
    state.widePreviewCleanupTimer = null;
  }, EXPANSION_DURATION_MS);
}
