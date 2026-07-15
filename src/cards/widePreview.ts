import { config } from '../config';
import type { CardState } from '../types/state';
import { getCardLayoutKind } from './layout';

const MANAGED_CLASS = 'jmp-wide-preview-card';
const EXPANDED_CLASS = 'jmp-wide-preview-expanded';
const EXPANSION_DURATION_MS = 280;

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
  const maximumCardWidth = Math.max(cardWidth, Math.min(layoutWidth, window.innerWidth) * 0.72);
  const targetCardWidth = Math.min(unclampedCardWidth, maximumCardWidth);
  const targetHostWidth = hostWidth + Math.max(0, targetCardWidth - cardWidth);

  if (targetCardWidth <= cardWidth + 1) {
    return null;
  }

  state.widePreviewCard = card;
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
