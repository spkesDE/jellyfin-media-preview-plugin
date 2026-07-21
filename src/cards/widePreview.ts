import { config } from '../config';
import type { AspectRatio } from '../types/preview';
import type { CardState } from '../types/state';
import { getCardLayoutKind } from './layout';
import { planRowCompression } from './rowCompression';

const MANAGED_CLASS = 'jmp-wide-preview-card';
const EXPANDED_CLASS = 'jmp-wide-preview-expanded';
const ROW_MANAGED_CLASS = 'jmp-wide-preview-row-card';
const ROW_ADJUSTED_CLASS = 'jmp-wide-preview-row-adjusted';
const SCROLLER_SHIFT_CLASS = 'jmp-wide-preview-scroller-shift';
const EXPANSION_DURATION_MS = 280;
const VIEWPORT_GUTTER_PX = 12;
const ROW_TOP_TOLERANCE_PX = 3;
const activeWidePreviewStates = new Set<CardState>();
let viewportResizeFrame: number | null = null;
let viewportResizeBound = false;

type CardContainerKind = 'horizontal' | 'wrapped' | 'other';

interface CardContainerLayout {
  container: HTMLElement;
  kind: CardContainerKind;
  styles: CSSStyleDeclaration;
}

interface RowCardAdjustment {
  card: HTMLElement;
  originalWidth: number;
  targetWidth: number;
}

interface WrappedRowPlan {
  adjustments: RowCardAdjustment[];
  targetCardWidth: number;
}

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

function restoreManagedRowCards(state: CardState): void {
  (state.widePreviewRowCards || []).forEach((rowCard) => {
    rowCard.classList.remove(ROW_ADJUSTED_CLASS);
  });
}

function cleanupManagedRowCards(state: CardState): void {
  (state.widePreviewRowCards || []).forEach((rowCard) => {
    rowCard.classList.remove(ROW_MANAGED_CLASS, ROW_ADJUSTED_CLASS);
    rowCard.style.removeProperty('--jmp-wide-preview-row-card-width');
    rowCard.style.removeProperty('--jmp-wide-preview-duration');
  });
  state.widePreviewRowCards = [];
}

function cleanupManagedCard(state: CardState): void {
  const card = state.widePreviewCard;
  if (card) {
    card.classList.remove(MANAGED_CLASS, EXPANDED_CLASS);
    card.style.removeProperty('--jmp-wide-preview-card-width');
    card.style.removeProperty('--jmp-wide-preview-media-height');
    card.style.removeProperty('--jmp-wide-preview-duration');
  }

  cleanupManagedRowCards(state);
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

function restoreOtherWidePreviews(currentState: CardState): void {
  Array.from(activeWidePreviewStates).forEach((activeState) => {
    if (activeState !== currentState) {
      restorePortraitCardWidth(activeState, true);
    }
  });
}

function getCardContainerLayout(card: HTMLElement): CardContainerLayout | null {
  const itemsContainer = card.closest('.itemsContainer');
  const container = itemsContainer instanceof HTMLElement
    ? itemsContainer
    : card.parentElement;
  if (!container) {
    return null;
  }

  const styles = window.getComputedStyle(container);
  const isFlexRow = (styles.display === 'flex' || styles.display === 'inline-flex')
    && (styles.flexDirection === 'row' || styles.flexDirection === 'row-reverse');
  const kind: CardContainerKind = !isFlexRow
    ? 'other'
    : styles.flexWrap === 'nowrap'
      ? 'horizontal'
      : 'wrapped';

  return { container, kind, styles };
}

function getVisibleRowCards(card: HTMLElement, container: HTMLElement): HTMLElement[] {
  const activeRect = card.getBoundingClientRect();
  return Array.from(container.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement)
    .filter((child) => {
      const rect = child.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && Math.abs(rect.top - activeRect.top) <= ROW_TOP_TOLERANCE_PX;
    })
    .sort((left, right) => left.getBoundingClientRect().left - right.getBoundingClientRect().left);
}

function parsePixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function planWrappedRow(
  card: HTMLElement,
  layout: CardContainerLayout,
  cardWidth: number,
  desiredCardWidth: number
): WrappedRowPlan | null {
  const rowCards = getVisibleRowCards(card, layout.container);
  const activeIndex = rowCards.indexOf(card);
  if (activeIndex < 0 || rowCards.length < 2) {
    return null;
  }

  const widths = rowCards.map((rowCard) => rowCard.getBoundingClientRect().width);
  const contentWidth = Math.max(
    0,
    layout.container.clientWidth
      - parsePixels(layout.styles.paddingLeft)
      - parsePixels(layout.styles.paddingRight)
  );
  const columnGap = parsePixels(layout.styles.columnGap);
  const occupiedWidth = widths.reduce((sum, width) => sum + width, 0)
    + columnGap * Math.max(0, rowCards.length - 1);
  const freeWidth = Math.max(0, contentWidth - occupiedWidth);
  const requestedGrowth = Math.max(0, desiredCardWidth - cardWidth);
  const requestedCompression = Math.max(0, requestedGrowth - freeWidth);
  const compression = planRowCompression(
    widths,
    activeIndex,
    requestedCompression,
    config.portraitCardCompressionMode
  );
  const actualGrowth = Math.min(requestedGrowth, freeWidth + compression.providedWidth);
  if (actualGrowth <= 1) {
    return null;
  }

  const adjustments = rowCards.flatMap((rowCard, index): RowCardAdjustment[] => {
    if (index === activeIndex) {
      return [];
    }

    const reduction = compression.reductions[index];
    if (!config.portraitCardRowLockEnabled && reduction <= 0.1) {
      return [];
    }

    return [{
      card: rowCard,
      originalWidth: widths[index],
      targetWidth: Math.max(0, widths[index] - reduction)
    }];
  });

  return {
    adjustments,
    targetCardWidth: cardWidth + actualGrowth
  };
}

function prepareRowAdjustments(adjustments: RowCardAdjustment[], state: CardState): void {
  state.widePreviewRowCards = adjustments.map((adjustment) => adjustment.card);
  adjustments.forEach((adjustment) => {
    adjustment.card.style.setProperty('--jmp-wide-preview-duration', `${EXPANSION_DURATION_MS}ms`);
    adjustment.card.style.setProperty('--jmp-wide-preview-row-card-width', `${adjustment.originalWidth}px`);
    adjustment.card.classList.add(ROW_MANAGED_CLASS, ROW_ADJUSTED_CLASS);
  });
}

function applyRowAdjustments(adjustments: RowCardAdjustment[]): void {
  adjustments.forEach((adjustment) => {
    adjustment.card.style.setProperty('--jmp-wide-preview-row-card-width', `${adjustment.targetWidth}px`);
  });
}

export function expandPortraitCardForPreview(
  card: HTMLElement,
  state: CardState,
  sourceAspectRatio?: AspectRatio | null
): WidePreviewDimensions | null {
  if (
    config.portraitCardExpansionMode === 'off'
    || getCardLayoutKind(card) !== 'portrait'
    || !state.rootHost
  ) {
    return null;
  }

  const layout = getCardContainerLayout(card);
  if (!layout) {
    return null;
  }

  const layoutMode = config.portraitCardExpansionLayoutMode;
  if (
    (layoutMode === 'horizontal-only' && layout.kind !== 'horizontal')
    || (layoutMode === 'compress' && layout.kind === 'other')
  ) {
    return null;
  }

  const compressWrappedRow = layoutMode === 'compress' && layout.kind === 'wrapped';
  restoreOtherWidePreviews(state);
  clearCleanupTimer(state);

  if (state.widePreviewCard === card && card.classList.contains(EXPANDED_CLASS)) {
    const configuredWidth = Number.parseFloat(card.style.getPropertyValue('--jmp-wide-preview-card-width'));
    const hostHeight = Number.parseFloat(card.style.getPropertyValue('--jmp-wide-preview-media-height'));
    const width = state.rootHost.offsetWidth + Math.max(0, configuredWidth - card.offsetWidth);
    return Number.isFinite(width) && Number.isFinite(hostHeight)
      ? { width, height: hostHeight }
      : null;
  }

  if (state.widePreviewCard) {
    cleanupManagedCard(state);
  }
  restoreScrollerShift(state, true);

  const scalable = state.rootHost.closest('.cardScalable');
  const cardRect = card.getBoundingClientRect();
  const cardWidth = cardRect.width;
  const hostWidth = state.rootHost.offsetWidth;
  const hostHeight = scalable instanceof HTMLElement
    ? scalable.offsetHeight
    : state.rootHost.offsetHeight;
  if (!cardWidth || !hostWidth || !hostHeight) {
    return null;
  }

  const aspectRatio = config.portraitCardExpansionMode === 'source'
    && sourceAspectRatio?.width
    && sourceAspectRatio.height
    ? sourceAspectRatio.width / sourceAspectRatio.height
    : config.portraitCardExpansionMode === '3:2'
      ? 3 / 2
      : 16 / 9;
  const desiredHostWidth = hostHeight * aspectRatio;
  const unclampedCardWidth = cardWidth + Math.max(0, desiredHostWidth - hostWidth);
  const layoutWidth = layout.container.clientWidth || window.innerWidth;
  const maximumCardWidth = Math.max(cardWidth, Math.min(layoutWidth, window.innerWidth) * 0.72);
  let targetCardWidth = Math.min(unclampedCardWidth, maximumCardWidth);
  let rowAdjustments: RowCardAdjustment[] = [];

  if (compressWrappedRow) {
    const rowPlan = planWrappedRow(card, layout, cardWidth, targetCardWidth);
    if (!rowPlan) {
      return null;
    }
    targetCardWidth = rowPlan.targetCardWidth;
    rowAdjustments = rowPlan.adjustments;
  }

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

  if (!compressWrappedRow && leftShift > 0) {
    state.widePreviewScroller = layout.container;
    state.widePreviewScrollerTranslate = layout.container.style.translate;
    layout.container.style.setProperty('--jmp-wide-preview-duration', `${EXPANSION_DURATION_MS}ms`);
    layout.container.classList.add(SCROLLER_SHIFT_CLASS);
    void layout.container.offsetWidth;
    layout.container.style.translate = `${-leftShift}px 0`;
  }

  prepareRowAdjustments(rowAdjustments, state);
  card.style.setProperty('--jmp-wide-preview-card-width', `${targetCardWidth}px`);
  card.style.setProperty('--jmp-wide-preview-media-height', `${hostHeight}px`);
  card.style.setProperty('--jmp-wide-preview-duration', `${EXPANSION_DURATION_MS}ms`);
  card.classList.add(MANAGED_CLASS);
  void layout.container.offsetWidth;
  applyRowAdjustments(rowAdjustments);
  card.classList.add(EXPANDED_CLASS);

  return { width: targetHostWidth, height: hostHeight };
}

export function restorePortraitCardWidth(state: CardState | null | undefined, immediate = false): void {
  if (!state?.widePreviewCard) {
    return;
  }

  clearCleanupTimer(state);
  state.widePreviewCard.classList.remove(EXPANDED_CLASS);
  restoreManagedRowCards(state);
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
