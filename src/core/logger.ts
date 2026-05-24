import { config } from '../config';
import { getImageRenderHost, getItemIdFromCard } from '../cards/discovery';

export function debugLog(...args: unknown[]): void {
  if (!config.debug) {
    return;
  }

  console.debug('[MediaPreview]', ...args);
}

export function log(...args: unknown[]): void {
  console.log('[MediaPreview]', ...args);
}

export function debugCardSummary(card: HTMLElement | null, label: string, extra?: unknown): void {
  if (!config.debug || !card) {
    return;
  }

  debugLog(label, {
    itemId: getItemIdFromCard(card),
    type: card.getAttribute('data-type'),
    classes: card.className,
    imageHost: getImageRenderHost(card)?.className || null,
    extra: extra || null
  });
}
