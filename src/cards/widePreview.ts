import { config } from '../config';
import type { CardState } from '../types/state';
import { getCardLayoutKind } from './layout';

const MANAGED_CLASS = 'jmp-wide-preview-card';
const EXPANDED_CLASS = 'jmp-wide-preview-expanded';
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

function cleanupManagedCard(state: CardState): void {
  const card = state.widePreviewCard;
  if (!card) {
    return;
  }

  card.classList.remove(MANAGED_CLASS, EXPANDED_CLASS);
  card.style.removeProperty('--jmp-wide-preview-card-width');
  card.style.removeProperty('--jmp-wide-preview-media-height');
  card.style.removeProperty('--jmp-wide-preview-duration');
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
  const parentRect = card.parentElement?.getBoundingClientRect();
  const availableRightEdge = Math.min(window.innerWidth, parentRect?.right || window.innerWidth);
  const availableWidth = Math.max(cardWidth, availableRightEdge - Math.max(0, cardRect.left) - VIEWPORT_GUTTER_PX);
  const maximumCardWidth = Math.max(
    cardWidth,
    Math.min(Math.min(layoutWidth, window.innerWidth) * 0.72, availableWidth)
  );
  const targetCardWidth = Math.min(unclampedCardWidth, maximumCardWidth);
  const targetHostWidth = hostWidth + Math.max(0, targetCardWidth - cardWidth);

  if (targetCardWidth <= cardWidth + 1) {
    return null;
  }

  state.widePreviewCard = card;
  activeWidePreviewStates.add(state);
  bindViewportResize();
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

  if (immediate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    cleanupManagedCard(state);
    return;
  }

  state.widePreviewCleanupTimer = window.setTimeout(() => {
    cleanupManagedCard(state);
    state.widePreviewCleanupTimer = null;
  }, EXPANSION_DURATION_MS);
}
