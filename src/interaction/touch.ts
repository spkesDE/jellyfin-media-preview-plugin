import { config } from '../config';
import { getHoverCardFromEventTarget } from '../cards/discovery';
import { runtimeState } from '../runtime';
import { scrubTouchPreview, startTouchPreview, stopTouchPreview } from './hover';

/**
 * Touch previews: a long-press on a card's image starts the preview, moving the finger
 * sideways while still holding scrubs Trickplay, and the preview keeps running after the
 * finger lifts until the next touch somewhere else. A short tap still opens the item.
 *
 * Jellyfin Web opens multi-select on a long-press. While this is on, a long-press on a card
 * image starts a preview instead; elsewhere on the card Jellyfin's own long-press still applies.
 */

const MOVE_TOLERANCE_PX = 10;
const CLICK_SUPPRESS_MS = 700;
const ROOT_CLASS = 'jmp-touch-previews';

interface TouchGesture {
  card: HTMLElement;
  startX: number;
  startY: number;
  timer: number | null;
  activated: boolean;
}

let gesture: TouchGesture | null = null;
let activeCard: HTMLElement | null = null;
let suppressClickCard: HTMLElement | null = null;
let suppressClickUntil = 0;
let handlers: {
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
  onTouchCancel: () => void;
  onContextMenu: (event: Event) => void;
  onClick: (event: MouseEvent) => void;
} | null = null;

function getLongPressMs(): number {
  return Math.max(250, Math.min(1500, Number(config.touchLongPressMs) || 450));
}

function clearGestureTimer(): void {
  if (gesture?.timer) {
    window.clearTimeout(gesture.timer);
    gesture.timer = null;
  }
}

function stopActivePreview(): void {
  if (activeCard) {
    stopTouchPreview(activeCard);
    activeCard = null;
  }
}

function activate(current: TouchGesture): void {
  clearGestureTimer();
  if (!startTouchPreview(current.card, current.startX, current.startY)) {
    gesture = null;
    return;
  }

  current.activated = true;
  activeCard = current.card;
  navigator.vibrate?.(10);
}

function onTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 1 || runtimeState.expandedTrailerSession) {
    clearGestureTimer();
    gesture = null;
    return;
  }

  const touch = event.touches[0];
  const card = getHoverCardFromEventTarget(event.target);
  if (activeCard && activeCard !== card) {
    // Touching anywhere else (including to scroll) ends the running preview.
    stopActivePreview();
  }

  clearGestureTimer();
  gesture = null;
  if (!card || !config.enabled || !config.touchPreviewEnabled || config.userPreviewEnabled === false) {
    return;
  }

  const current: TouchGesture = {
    card,
    startX: touch.clientX,
    startY: touch.clientY,
    timer: null,
    activated: false
  };
  current.timer = window.setTimeout(() => activate(current), getLongPressMs());
  gesture = current;
}

function onTouchMove(event: TouchEvent): void {
  const current = gesture;
  if (!current || event.touches.length !== 1) {
    return;
  }

  const touch = event.touches[0];
  if (!current.activated) {
    if (Math.hypot(touch.clientX - current.startX, touch.clientY - current.startY) > MOVE_TOLERANCE_PX) {
      // The finger moved before the long-press finished: this is a scroll or swipe.
      clearGestureTimer();
      gesture = null;
    }
    return;
  }

  // While the preview holds the finger, the page must not scroll under it.
  if (event.cancelable) {
    event.preventDefault();
  }
  scrubTouchPreview(current.card, touch.clientX);
}

function onTouchEnd(event: TouchEvent): void {
  const current = gesture;
  clearGestureTimer();
  gesture = null;
  if (!current?.activated) {
    return;
  }

  // Lifting the finger after a long-press must not open the item.
  if (event.cancelable) {
    event.preventDefault();
  }
  suppressClickCard = current.card;
  suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
}

function onTouchCancel(): void {
  clearGestureTimer();
  gesture = null;
}

function onContextMenu(event: Event): void {
  const current = gesture;
  const target = event.target instanceof Node ? event.target : null;
  if (current && target && current.card.contains(target)) {
    // The browser decided this is a long-press before our timer did.
    if (!current.activated) {
      activate(current);
    }
    if (current.activated) {
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }

  if (activeCard && target && activeCard.contains(target)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function onClick(event: MouseEvent): void {
  if (!suppressClickCard || Date.now() > suppressClickUntil) {
    suppressClickCard = null;
    return;
  }

  const target = event.target instanceof Node ? event.target : null;
  if (target && suppressClickCard.contains(target)) {
    event.preventDefault();
    event.stopPropagation();
  }
  suppressClickCard = null;
}

export function bindTouchEvents(): void {
  if (handlers || !config.touchPreviewEnabled) {
    return;
  }

  handlers = { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onContextMenu, onClick };
  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  // Not passive: scrubbing has to stop the page from scrolling.
  document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
  document.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true });
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('click', onClick, true);
  document.documentElement.classList.add(ROOT_CLASS);
}

export function unbindTouchEvents(): void {
  clearGestureTimer();
  gesture = null;
  stopActivePreview();
  suppressClickCard = null;
  if (!handlers) {
    return;
  }

  document.removeEventListener('touchstart', handlers.onTouchStart, true);
  document.removeEventListener('touchmove', handlers.onTouchMove, true);
  document.removeEventListener('touchend', handlers.onTouchEnd, true);
  document.removeEventListener('touchcancel', handlers.onTouchCancel, true);
  document.removeEventListener('contextmenu', handlers.onContextMenu, true);
  document.removeEventListener('click', handlers.onClick, true);
  document.documentElement.classList.remove(ROOT_CLASS);
  handlers = null;
}

/** For tests: the card whose touch preview is running. */
export function getActiveTouchCard(): HTMLElement | null {
  return activeCard;
}
