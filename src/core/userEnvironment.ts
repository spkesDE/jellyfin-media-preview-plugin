import { config } from '../config';
import { HOVER_MODE_AUTO } from '../constants';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/** True when the viewer asked the operating system to reduce motion. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

/**
 * Auto mode animates Trickplay frames on its own. With reduced motion the card falls back to
 * pointer scrubbing, so frames only change when the viewer moves the pointer.
 */
export function isAutoHoverMode(): boolean {
  return config.hoverMode === HOVER_MODE_AUTO && !prefersReducedMotion();
}

/**
 * True when the browser reports Data Saver or a very slow connection. Video previews
 * (trailers, Direct Play) are then skipped and only Trickplay images are used.
 */
export function isDataSaverActive(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) {
    return false;
  }

  return connection.saveData === true || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
}
